import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import {
  ConnectionRequest,
  ConnectionRequestStatus,
} from "@/src/api/entities/ConnectionRequest";
import { Person } from "@/src/api/entities/Person";
import {
  Relationship,
  RelationshipType,
} from "@/src/api/entities/Relationship";
import { XPEventType } from "@/src/api/entities/XPEvent";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import { canEditPerson } from "@/src/lib/permissions";
import { mergePersons } from "@/src/api/services/merge.service";
import { awardXP } from "@/src/api/services/gamification/gamification.service";

const VALID_REL_TYPES = new Set(Object.values(RelationshipType));

/** POST /api/connection-requests/[id]/respond */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const user = await getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const repo = AppDataSource.getRepository(ConnectionRequest);
  const cr = await repo.findOne({ where: { id: Number(id) } });
  if (!cr) return apiError(ApiError.notFound("Connection request not found."));
  if (cr.status !== ConnectionRequestStatus.PENDING) {
    return apiError(ApiError.badRequest("Already responded."));
  }

  const target = await AppDataSource.getRepository(Person).findOne({
    where: { id: cr.targetPersonId },
  });
  if (!target) return apiError(ApiError.notFound("Target person not found."));
  if (!(await canEditPerson(user, target))) {
    return apiError(
      ApiError.forbidden("Only stewards of the target person can respond."),
    );
  }

  const body = await req.json();
  const { decision } = body as { decision: string };
  if (!["accepted", "declined"].includes(decision)) {
    return apiError(
      ApiError.badRequest("decision must be accepted or declined."),
    );
  }

  cr.respondedByUserId = user.id;

  if (decision === "declined") {
    cr.status = ConnectionRequestStatus.DECLINED;
    await repo.save(cr);
    return apiSuccess({ request: cr }, "Connection request declined");
  }

  cr.status = ConnectionRequestStatus.ACCEPTED;
  await repo.save(cr);

  const relType = cr.proposedRelationshipType;
  const isSamePerson =
    !relType || relType === "same_person" || relType === "duplicate_person";

  if (isSamePerson && cr.fromPersonId) {
    await mergePersons(cr.fromPersonId, cr.targetPersonId, user.id);
  } else if (cr.fromPersonId && relType && VALID_REL_TYPES.has(relType as RelationshipType)) {
    const relRepo = AppDataSource.getRepository(Relationship);
    await relRepo.save(
      relRepo.create({
        personAId: cr.fromPersonId,
        personBId: cr.targetPersonId,
        type: relType as RelationshipType,
        createdByUserId: user.id,
      }),
    );
  }

  await awardXP(
    cr.fromUserId,
    XPEventType.CONNECT_RELATIVE,
    cr.id,
    "Connection request accepted",
  );
  await awardXP(
    user.id,
    XPEventType.CONNECT_RELATIVE,
    cr.id,
    "Accepted a connection request",
  );

  return apiSuccess({ request: cr }, "Connection request accepted");
}
