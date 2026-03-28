import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Relationship } from "@/src/api/entities/Relationship";
import { XPEventType } from "@/src/api/entities/XPEvent";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { getAuthUser } from "@/src/lib/auth";
import { awardXP } from "@/src/api/services/gamification/gamification.service";

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const repo = AppDataSource.getRepository(Relationship);
  const { searchParams } = new URL(req.url);
  const personId = searchParams.get("personId");

  if (personId) {
    const rels = await repo.find({
      where: [{ personAId: Number(personId) }, { personBId: Number(personId) }],
    });

    return apiSuccess({ relationships: rels }, "Relationships retrieved");
  }

  const rels = await repo.find({ order: { createdAt: "DESC" } });

  return apiSuccess({ relationships: rels }, "Relationships retrieved");
}

export async function POST(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const body = await req.json();
  const { personAId, personBId, type } = body;

  if (!personAId || !personBId || !type) {
    return apiError(
      ApiError.badRequest("personAId, personBId and type are required."),
    );
  }
  if (personAId === personBId) {
    return apiError(
      ApiError.badRequest(
        "A person cannot have a relationship with themselves.",
      ),
    );
  }

  const repo = AppDataSource.getRepository(Relationship);
  const rel = repo.create({ ...body, createdByUserId: user.id });
  const saved = await repo.save(rel);

  const gamification = await awardXP(
    user.id,
    XPEventType.ADD_RELATIONSHIP,
    (saved as any).id,
    `Linked ${type} relationship`,
  );

  return apiSuccess(
    { relationship: saved, gamification },
    "Relationship created",
    201,
  );
}
