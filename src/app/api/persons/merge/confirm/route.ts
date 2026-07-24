import { NextRequest } from "next/server";

import { initializeDataSource } from "@/src/config/db";
import { XPEventType } from "@/src/api/entities/XPEvent";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import { canEditPerson } from "@/src/lib/permissions";
import { mergePersons } from "@/src/api/services/merge.service";
import { awardXP } from "@/src/api/services/gamification/gamification.service";
import { AppDataSource } from "@/src/config/db";
import { Person } from "@/src/api/entities/Person";

/** POST /api/persons/merge/confirm — self-serve merge for stewards */
export async function POST(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const body = await req.json();
  const sourceId = Number(body.sourceId);
  const targetId = Number(body.targetId);

  if (!sourceId || !targetId) {
    return apiError(ApiError.badRequest("sourceId and targetId are required."));
  }
  if (sourceId === targetId) {
    return apiError(ApiError.badRequest("Cannot merge a person into itself."));
  }

  const repo = AppDataSource.getRepository(Person);
  const source = await repo.findOne({ where: { id: sourceId } });
  const target = await repo.findOne({ where: { id: targetId } });

  if (!source || !target) {
    return apiError(ApiError.notFound("Person not found."));
  }

  const canSource = await canEditPerson(user, source);
  const canTarget = await canEditPerson(user, target);
  if ((!canSource || !canTarget) && user.role !== "admin") {
    return apiError(
      ApiError.forbidden("You must be a steward of both people to merge them."),
    );
  }

  const outcome = await mergePersons(sourceId, targetId, user.id);
  await awardXP(
    user.id,
    XPEventType.CONFIRM_MERGE,
    targetId,
    "Confirmed person merge",
  );

  return apiSuccess({ outcome }, "Persons merged");
}
