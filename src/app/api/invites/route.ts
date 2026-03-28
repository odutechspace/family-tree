import { randomUUID } from "crypto";

import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { FamilyInvite, InviteStatus } from "@/src/api/entities/FamilyInvite";
import { FamilyTree } from "@/src/api/entities/FamilyTree";
import { Person } from "@/src/api/entities/Person";
import { User } from "@/src/api/entities/User";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import { sendMail } from "@/src/api/services/mail/mail.service";
import { baseTemplate } from "@/src/api/services/mail/baseTemplate";

const INVITE_TTL_DAYS = 7;

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { searchParams } = new URL(req.url);
  const treeId = searchParams.get("treeId");

  const repo = AppDataSource.getRepository(FamilyInvite);
  const invites = await repo.find({
    where: {
      invitedByUserId: user.id,
      ...(treeId ? { treeId: Number(treeId) } : {}),
    },
    order: { createdAt: "DESC" },
  });

  return apiSuccess({ invites }, "Invites retrieved");
}

export async function POST(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const body = await req.json();
  const {
    email,
    treeId,
    personId,
    message,
  }: { email: string; treeId: number; personId?: number; message?: string } =
    body;

  if (!email || !treeId) {
    return apiError(ApiError.badRequest("email and treeId are required."));
  }

  // Verify caller owns or can access this tree
  const treeRepo = AppDataSource.getRepository(FamilyTree);
  const tree = await treeRepo.findOne({ where: { id: Number(treeId) } });

  if (!tree) return apiError(ApiError.notFound("Family tree not found."));
  if (tree.ownerUserId !== user.id) {
    return apiError(
      ApiError.forbidden("Only the tree owner can send invites."),
    );
  }

  // Verify the person exists if provided
  let person: Person | null = null;

  if (personId) {
    person = await AppDataSource.getRepository(Person).findOne({
      where: { id: Number(personId) },
    });
    if (!person) return apiError(ApiError.notFound("Person not found."));
  }

  // Revoke any existing pending invite for same email + tree
  const inviteRepo = AppDataSource.getRepository(FamilyInvite);
  const existing = await inviteRepo.findOne({
    where: {
      email: email.toLowerCase(),
      treeId: Number(treeId),
      status: InviteStatus.PENDING,
    },
  });

  if (existing) {
    existing.status = InviteStatus.REVOKED;
    await inviteRepo.save(existing);
  }

  // Create new invite
  const expiresAt = new Date();

  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);

  const invite = inviteRepo.create({
    token: randomUUID(),
    email: email.toLowerCase(),
    treeId: Number(treeId),
    personId: personId ? Number(personId) : undefined,
    message: message || undefined,
    invitedByUserId: user.id,
    expiresAt,
  });
  const saved = await inviteRepo.save(invite);

  // Look up inviter name
  const inviterUser = await AppDataSource.getRepository(User).findOne({
    where: { id: user.id },
    select: ["name", "email"],
  });
  const inviterName = inviterUser?.name || "A family member";

  // Build accept URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const acceptUrl = `${appUrl}/invite/accept?token=${saved.token}`;

  const personClause = person
    ? `<p>You have been identified as <strong>${person.firstName} ${person.lastName}</strong> in the tree. Once you join, your profile will be linked automatically.</p>`
    : "";

  const html = baseTemplate(
    `
    <h2 style="color:#215563;">You've been invited to join a family tree! 🌳</h2>
    <p>Hi there,</p>
    <p><strong>${inviterName}</strong> has invited you to contribute to the <strong>${tree.name}</strong> family tree on My Ukoo.</p>
    ${personClause}
    ${message ? `<p style="font-style:italic;border-left:3px solid #215563;padding-left:12px;">"${message}"</p>` : ""}
    <p>Click the button below to join — it only takes a minute to set up your account.</p>
    <p style="text-align:center;margin:32px 0;">
      <a href="${acceptUrl}" class="btn" style="background-color:#215563;padding:12px 28px;border-radius:12px;color:white;font-weight:600;text-decoration:none;display:inline-block;">
        Join the Family Tree →
      </a>
    </p>
    <p style="font-size:13px;color:#666;">This invite expires in ${INVITE_TTL_DAYS} days. If you did not expect this email, you can safely ignore it.</p>
    `,
    email,
  );

  await sendMail(
    email,
    `${inviterName} invited you to their family tree on My Ukoo`,
    html,
  );

  return apiSuccess({ invite: saved }, "Invite sent", 201);
}
