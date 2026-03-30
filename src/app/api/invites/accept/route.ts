import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { FamilyInvite, InviteStatus } from "@/src/api/entities/FamilyInvite";
import {
  FamilyTreeMember,
  TreeMemberRole,
} from "@/src/api/entities/FamilyTreeMember";
import { FamilyTree } from "@/src/api/entities/FamilyTree";
import { Person } from "@/src/api/entities/Person";
import { User } from "@/src/api/entities/User";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import { generateToken } from "@/src/lib/jwt";

/** GET /api/invites/accept?token=xxx — look up an invite without accepting it */
export async function GET(req: NextRequest) {
  await initializeDataSource();

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return apiError(ApiError.badRequest("token is required."));

  const repo = AppDataSource.getRepository(FamilyInvite);
  const invite = await repo.findOne({ where: { token } });

  if (!invite) return apiError(ApiError.notFound("Invite not found."));
  if (invite.status === InviteStatus.REVOKED) {
    return apiError(ApiError.badRequest("This invite has been revoked."));
  }
  if (invite.status === InviteStatus.ACCEPTED) {
    return apiError(ApiError.badRequest("This invite has already been used."));
  }
  if (new Date() > invite.expiresAt) {
    invite.status = InviteStatus.EXPIRED;
    await repo.save(invite);

    return apiError(ApiError.badRequest("This invite has expired."));
  }

  // Fetch related tree + person for display
  const tree = await AppDataSource.getRepository(FamilyTree).findOne({
    where: { id: invite.treeId },
  });
  let person: Person | null = null;

  if (invite.personId) {
    person = await AppDataSource.getRepository(Person).findOne({
      where: { id: invite.personId },
    });
  }

  // Check if the invited email already has an account
  const existingUser = await AppDataSource.getRepository(User).findOne({
    where: { email: invite.email },
    select: ["id", "name", "email"],
  });

  return apiSuccess(
    {
      invite: {
        id: invite.id,
        email: invite.email,
        message: invite.message,
        treeId: invite.treeId,
        personId: invite.personId,
        expiresAt: invite.expiresAt,
      },
      tree: tree ? { id: tree.id, name: tree.name } : null,
      person: person
        ? {
            id: person.id,
            firstName: person.firstName,
            middleName: person.middleName,
            lastName: person.lastName,
            maidenName: person.maidenName,
            nickname: person.nickname,
          }
        : null,
      hasAccount: !!existingUser,
    },
    "Invite details retrieved",
  );
}

/**
 * POST /api/invites/accept
 * Body: { token, name?, password? }
 *
 * Two flows:
 * 1. Already logged in  → just accept the invite using the auth cookie
 * 2. New user           → create account with { name, password }, then accept
 * 3. Existing user, not logged in → caller should log in first, then POST again
 */
export async function POST(req: NextRequest) {
  await initializeDataSource();

  const body = await req.json();
  const { token, name, password } = body as {
    token: string;
    name?: string;
    password?: string;
  };

  if (!token) return apiError(ApiError.badRequest("token is required."));

  const inviteRepo = AppDataSource.getRepository(FamilyInvite);
  const invite = await inviteRepo.findOne({ where: { token } });

  if (!invite) return apiError(ApiError.notFound("Invite not found."));
  if (invite.status !== InviteStatus.PENDING) {
    return apiError(ApiError.badRequest(`Invite is ${invite.status}.`));
  }
  if (new Date() > invite.expiresAt) {
    invite.status = InviteStatus.EXPIRED;
    await inviteRepo.save(invite);

    return apiError(ApiError.badRequest("This invite has expired."));
  }

  const userRepo = AppDataSource.getRepository(User);
  const personRepo = AppDataSource.getRepository(Person);
  const memberRepo = AppDataSource.getRepository(FamilyTreeMember);

  let userId: number;
  let jwtToken: string | null = null;

  // --- Determine user ---
  const authUser = await getAuthUser(req);

  if (authUser) {
    // Already logged in
    userId = authUser.id;
  } else {
    // Not logged in — check if email already has an account
    const existing = await userRepo.findOne({ where: { email: invite.email } });

    if (existing) {
      // They need to log in first
      return apiError(
        ApiError.badRequest(
          "An account already exists for this email. Please log in first, then follow the invite link again.",
        ),
      );
    }

    // Create new account
    if (!name || !password) {
      return apiError(
        ApiError.badRequest(
          "name and password are required to create a new account.",
        ),
      );
    }
    const hashed = await bcrypt.hash(password, 10);
    const newUser = userRepo.create({
      name,
      email: invite.email,
      password: hashed,
    });
    const savedUser = await userRepo.save(newUser);

    userId = savedUser.id;

    // Generate a JWT so they're logged in immediately after accepting
    jwtToken = await generateToken(userId, "user");
  }

  // --- Link person to user if specified ---
  if (invite.personId) {
    const person = await personRepo.findOne({ where: { id: invite.personId } });

    if (person && !person.linkedUserId) {
      person.linkedUserId = userId;
      await personRepo.save(person);
    }
    // Also set linkedPersonId on the user
    const user = await userRepo.findOne({ where: { id: userId } });

    if (user && !user.linkedPersonId) {
      user.linkedPersonId = invite.personId;
      await userRepo.save(user);
    }
  }

  // --- Add to tree as member if not already ---
  const existingMembership = await memberRepo.findOne({
    where: { treeId: invite.treeId, userId },
  });

  if (!existingMembership) {
    // Use the invited person's personId if available, otherwise use a placeholder
    const personId = invite.personId ?? 0;

    if (personId > 0) {
      const alreadyInTree = await memberRepo.findOne({
        where: { treeId: invite.treeId, personId },
      });

      if (!alreadyInTree) {
        await memberRepo.save(
          memberRepo.create({
            treeId: invite.treeId,
            personId,
            userId,
            role: TreeMemberRole.EDITOR,
          }),
        );
      } else {
        // Update existing membership row to include userId
        alreadyInTree.userId = userId;
        await memberRepo.save(alreadyInTree);
      }
    }
  }

  // --- Mark invite as accepted ---
  invite.status = InviteStatus.ACCEPTED;
  await inviteRepo.save(invite);

  const response = apiSuccess(
    { treeId: invite.treeId },
    "Invite accepted. Welcome to the family tree!",
  );

  if (jwtToken) {
    response.cookies.set("token", jwtToken, { httpOnly: true, maxAge: 3600 });
  }

  return response;
}

/** DELETE /api/invites/accept?token=xxx — revoke an invite */
export async function DELETE(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return apiError(ApiError.badRequest("token is required."));

  const repo = AppDataSource.getRepository(FamilyInvite);
  const invite = await repo.findOne({ where: { token } });

  if (!invite) return apiError(ApiError.notFound("Invite not found."));
  if (invite.invitedByUserId !== user.id) {
    return apiError(ApiError.forbidden("Not authorized."));
  }

  invite.status = InviteStatus.REVOKED;
  await repo.save(invite);

  return apiSuccess({}, "Invite revoked");
}
