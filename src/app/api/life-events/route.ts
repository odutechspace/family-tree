import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { LifeEvent } from "@/src/api/entities/LifeEvent";
import { XPEventType } from "@/src/api/entities/XPEvent";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { getAuthUser } from "@/src/lib/auth";
import { awardXP } from "@/src/api/services/gamification/gamification.service";

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const repo = AppDataSource.getRepository(LifeEvent);
  const { searchParams } = new URL(req.url);
  const personId = searchParams.get("personId");
  if (!personId) return apiError(ApiError.badRequest("personId query param is required."));

  const events = await repo.find({
    where: { personId: Number(personId) },
    order: { eventDate: "ASC" },
  });
  return apiSuccess({ events }, "Life events retrieved");
}

export async function POST(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const body = await req.json();
  if (!body.personId || !body.type) return apiError(ApiError.badRequest("personId and type are required."));

  const repo = AppDataSource.getRepository(LifeEvent);
  const event = repo.create({ ...body, createdByUserId: user.id });
  const saved = await repo.save(event);

  const gamification = await awardXP(user.id, XPEventType.ADD_LIFE_EVENT, (saved as any).id, `Recorded ${body.type} event`);

  return apiSuccess({ event: saved, gamification }, "Life event created", 201);
}
