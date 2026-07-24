import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Person } from "@/src/api/entities/Person";
import { Relationship } from "@/src/api/entities/Relationship";
import {
  ProposedEdit,
  ProposedEditKind,
  ProposedEditStatus,
} from "@/src/api/entities/ProposedEdit";
import { XPEventType } from "@/src/api/entities/XPEvent";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import {
  canEditPerson,
  canReviewRelationshipRemoval,
} from "@/src/lib/permissions";
import { awardXP } from "@/src/api/services/gamification/gamification.service";

/** POST /api/proposed-edits/[id]/review */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const user = await getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const peRepo = AppDataSource.getRepository(ProposedEdit);
  const pe = await peRepo.findOne({ where: { id: Number(id) } });
  if (!pe) return apiError(ApiError.notFound("Proposed edit not found."));
  if (pe.status !== ProposedEditStatus.PENDING) {
    return apiError(ApiError.badRequest("Already reviewed."));
  }

  const body = await req.json();
  const { decision, reviewNotes } = body as {
    decision: string;
    reviewNotes?: string;
  };
  if (!["approved", "rejected"].includes(decision)) {
    return apiError(
      ApiError.badRequest("decision must be approved or rejected."),
    );
  }

  const kind = pe.kind || ProposedEditKind.FIELD_EDIT;

  if (kind === ProposedEditKind.REMOVE_RELATIONSHIP) {
    if (!pe.relationshipId) {
      return apiError(ApiError.badRequest("Missing relationshipId on proposal."));
    }
    const rel = await AppDataSource.getRepository(Relationship).findOne({
      where: { id: pe.relationshipId },
    });

    if (rel) {
      if (!(await canReviewRelationshipRemoval(user, rel))) {
        return apiError(
          ApiError.forbidden("Not authorized to review this removal."),
        );
      }
    } else {
      // Relationship already gone — allow context-person editors / admin to close.
      const contextPerson = await AppDataSource.getRepository(Person).findOne({
        where: { id: pe.personId },
      });
      if (!contextPerson || !(await canEditPerson(user, contextPerson))) {
        return apiError(
          ApiError.forbidden("Not authorized to review this removal."),
        );
      }
    }

    pe.reviewedByUserId = user.id;
    pe.reviewNotes = reviewNotes || null;
    pe.reviewedAt = new Date();

    if (decision === "approved") {
      if (rel) {
        await AppDataSource.getRepository(Relationship).remove(rel);
      }
      pe.status = ProposedEditStatus.APPROVED;
    } else {
      pe.status = ProposedEditStatus.REJECTED;
    }

    await peRepo.save(pe);
    return apiSuccess({ proposedEdit: pe }, `Proposed edit ${decision}`);
  }

  // Field edit path
  const person = await AppDataSource.getRepository(Person).findOne({
    where: { id: pe.personId },
  });
  if (!person) return apiError(ApiError.notFound("Person not found."));
  if (!(await canEditPerson(user, person))) {
    return apiError(ApiError.forbidden("Steward access required."));
  }

  pe.reviewedByUserId = user.id;
  pe.reviewNotes = reviewNotes || null;
  pe.reviewedAt = new Date();

  if (decision === "approved") {
    const changes = JSON.parse(pe.changes) as Record<string, unknown>;
    Object.assign(person, changes, {
      personCode: person.personCode,
      createdByUserId: person.createdByUserId,
    });
    await AppDataSource.getRepository(Person).save(person);
    pe.status = ProposedEditStatus.APPROVED;
    await awardXP(
      pe.proposedByUserId,
      XPEventType.WRITE_BIOGRAPHY,
      pe.id,
      "Proposed edit approved",
    );
  } else {
    pe.status = ProposedEditStatus.REJECTED;
  }

  await peRepo.save(pe);
  return apiSuccess({ proposedEdit: pe }, `Proposed edit ${decision}`);
}
