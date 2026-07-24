import { NextRequest } from "next/server";
import { In } from "typeorm";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import {
  ConnectionRequest,
  ConnectionRequestStatus,
} from "@/src/api/entities/ConnectionRequest";
import { Person } from "@/src/api/entities/Person";
import { User } from "@/src/api/entities/User";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import {
  getStewardsForPerson,
  stewardPersonIds,
} from "@/src/lib/permissions";
import { sendMail } from "@/src/api/services/mail/mail.service";
import { formatPersonDisplayName } from "@/src/lib/personDisplayName";

type PersonSummary = {
  id: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  maidenName?: string | null;
  nickname?: string | null;
  photoUrl?: string | null;
};

function toPersonSummary(p: Person): PersonSummary {
  return {
    id: p.id,
    firstName: p.firstName,
    middleName: p.middleName,
    lastName: p.lastName,
    maidenName: p.maidenName,
    nickname: p.nickname,
    photoUrl: p.photoUrl,
  };
}

async function enrichRequests(rows: ConnectionRequest[]) {
  if (rows.length === 0) return [];

  const personIds = new Set<number>();
  const userIds = new Set<number>();
  for (const r of rows) {
    personIds.add(r.targetPersonId);
    if (r.fromPersonId) personIds.add(r.fromPersonId);
    userIds.add(r.fromUserId);
  }

  const persons =
    personIds.size > 0
      ? await AppDataSource.getRepository(Person)
          .createQueryBuilder("p")
          .where("p.id IN (:...ids)", { ids: [...personIds] })
          .getMany()
      : [];
  const users =
    userIds.size > 0
      ? await AppDataSource.getRepository(User)
          .createQueryBuilder("u")
          .select(["u.id", "u.name", "u.profilePhotoUrl"])
          .where("u.id IN (:...ids)", { ids: [...userIds] })
          .getMany()
      : [];

  const personById = new Map(persons.map((p) => [p.id, toPersonSummary(p)]));
  const userById = new Map(
    users.map((u) => [
      u.id,
      { id: u.id, name: u.name, profilePhotoUrl: u.profilePhotoUrl },
    ]),
  );

  return rows.map((r) => ({
    ...r,
    targetPerson: personById.get(r.targetPersonId) ?? null,
    fromPerson: r.fromPersonId
      ? (personById.get(r.fromPersonId) ?? null)
      : null,
    fromUser: userById.get(r.fromUserId) ?? null,
  }));
}

/** GET /api/connection-requests?box=incoming|outgoing */
export async function GET(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const box = new URL(req.url).searchParams.get("box") || "incoming";
  const repo = AppDataSource.getRepository(ConnectionRequest);

  if (box === "outgoing") {
    const rows = await repo.find({
      where: { fromUserId: user.id },
      order: { createdAt: "DESC" },
    });
    const requests = await enrichRequests(rows);
    return apiSuccess({ requests }, "Outgoing connection requests");
  }

  const stewardIds = await stewardPersonIds(user.id);
  if (stewardIds.length === 0) {
    return apiSuccess({ requests: [] }, "Incoming connection requests");
  }
  const rows = await repo.find({
    where: {
      targetPersonId: In(stewardIds),
      status: ConnectionRequestStatus.PENDING,
    },
    order: { createdAt: "DESC" },
  });
  const requests = await enrichRequests(rows);
  return apiSuccess({ requests }, "Incoming connection requests");
}

/** POST /api/connection-requests */
export async function POST(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const body = await req.json();
  const targetPersonId = Number(body.targetPersonId);
  if (!targetPersonId) {
    return apiError(ApiError.badRequest("targetPersonId is required."));
  }

  const person = await AppDataSource.getRepository(Person).findOne({
    where: { id: targetPersonId },
  });
  if (!person) return apiError(ApiError.notFound("Person not found."));

  const me = await AppDataSource.getRepository(User).findOne({
    where: { id: user.id },
  });
  const fromPersonId =
    body.fromPersonId != null
      ? Number(body.fromPersonId)
      : me?.linkedPersonId ?? null;

  const repo = AppDataSource.getRepository(ConnectionRequest);
  const saved = await repo.save(
    repo.create({
      fromUserId: user.id,
      fromPersonId,
      targetPersonId,
      proposedRelationshipType: body.proposedRelationshipType || null,
      message: body.message || null,
      status: ConnectionRequestStatus.PENDING,
    }),
  );

  // Notify stewards (best-effort email)
  const stewards = await getStewardsForPerson(targetPersonId);
  const userRepo = AppDataSource.getRepository(User);
  for (const s of stewards) {
    const stewardUser = await userRepo.findOne({
      where: { id: s.userId },
      select: ["email", "name"],
    });
    if (!stewardUser?.email) continue;
    // Body only — deliverMail wraps with baseTemplate.
    const html = `
      <h2 style="margin:24px 0 16px;">New connection request</h2>
      <p>Someone wants to connect with <strong>${formatPersonDisplayName(person)}</strong> on My Ukoo.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/connections">Review requests →</a></p>
    `;
    await sendMail(
      stewardUser.email,
      "New family connection request on My Ukoo",
      html,
    ).catch(() => {});
  }

  return apiSuccess({ request: saved }, "Connection request sent", 201);
}
