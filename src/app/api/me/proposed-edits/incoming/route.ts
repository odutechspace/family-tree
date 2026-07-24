import { NextRequest } from "next/server";
import { In } from "typeorm";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import {
  ProposedEdit,
  ProposedEditKind,
  ProposedEditStatus,
} from "@/src/api/entities/ProposedEdit";
import { Person } from "@/src/api/entities/Person";
import { Relationship } from "@/src/api/entities/Relationship";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import {
  canReviewRelationshipRemoval,
  stewardPersonIds,
} from "@/src/lib/permissions";

/** GET /api/me/proposed-edits/incoming */
export async function GET(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const peRepo = AppDataSource.getRepository(ProposedEdit);
  const personRepo = AppDataSource.getRepository(Person);
  const relRepo = AppDataSource.getRepository(Relationship);

  const stewardIds =
    user.role === "admin"
      ? (await personRepo.find({ select: ["id"] })).map((p) => p.id)
      : await stewardPersonIds(user.id);

  // Field edits for stewarded people (or all people for admin).
  // Include rows with null/legacy kind by also matching without kind filter when needed.
  let fieldEdits: ProposedEdit[] = [];
  if (stewardIds.length > 0) {
    fieldEdits = await peRepo.find({
      where: {
        personId: In(stewardIds),
        status: ProposedEditStatus.PENDING,
        kind: ProposedEditKind.FIELD_EDIT,
      },
      order: { createdAt: "DESC" },
    });
  }

  // Remove-relationship proposals: filter by canReviewRelationshipRemoval
  const removalCandidates = await peRepo.find({
    where: {
      status: ProposedEditStatus.PENDING,
      kind: ProposedEditKind.REMOVE_RELATIONSHIP,
    },
    order: { createdAt: "DESC" },
  });

  const removalEdits: ProposedEdit[] = [];
  const relById = new Map<number, Relationship>();
  for (const pe of removalCandidates) {
    if (!pe.relationshipId) continue;
    let rel = relById.get(pe.relationshipId);
    if (!rel) {
      const found = await relRepo.findOne({
        where: { id: pe.relationshipId },
      });
      if (!found) continue;
      rel = found;
      relById.set(found.id, found);
    }
    if (await canReviewRelationshipRemoval(user, rel)) {
      removalEdits.push(pe);
    }
  }

  const edits = [...fieldEdits, ...removalEdits].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  if (edits.length === 0) {
    return apiSuccess({ proposedEdits: [] }, "Incoming proposed edits");
  }

  const personIdSet = new Set<number>();
  for (const e of edits) {
    personIdSet.add(e.personId);
    if (e.kind === ProposedEditKind.REMOVE_RELATIONSHIP && e.relationshipId) {
      const rel = relById.get(e.relationshipId);
      if (rel) {
        personIdSet.add(rel.personAId);
        personIdSet.add(rel.personBId);
      }
    }
  }

  const persons =
    personIdSet.size > 0
      ? await personRepo
          .createQueryBuilder("p")
          .where("p.id IN (:...ids)", { ids: [...personIdSet] })
          .getMany()
      : [];
  const byId = new Map(persons.map((p) => [p.id, p]));

  return apiSuccess(
    {
      proposedEdits: edits.map((e) => {
        const base = {
          ...e,
          changes:
            typeof e.changes === "string"
              ? JSON.parse(e.changes || "{}")
              : e.changes,
          person: byId.get(e.personId) ?? null,
        };
        if (
          e.kind === ProposedEditKind.REMOVE_RELATIONSHIP &&
          e.relationshipId
        ) {
          const rel = relById.get(e.relationshipId) ?? null;
          return {
            ...base,
            relationship: rel
              ? {
                  id: rel.id,
                  type: rel.type,
                  personAId: rel.personAId,
                  personBId: rel.personBId,
                  personA: byId.get(rel.personAId) ?? null,
                  personB: byId.get(rel.personBId) ?? null,
                }
              : null,
          };
        }
        return base;
      }),
    },
    "Incoming proposed edits",
  );
}
