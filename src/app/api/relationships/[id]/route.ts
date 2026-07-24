import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Person } from "@/src/api/entities/Person";
import { Relationship } from "@/src/api/entities/Relationship";
import {
  ProposedEdit,
  ProposedEditKind,
  ProposedEditStatus,
} from "@/src/api/entities/ProposedEdit";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import {
  canUnlinkRelationship,
  canViewPerson,
} from "@/src/lib/permissions";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const repo = AppDataSource.getRepository(Relationship);
  const rel = await repo.findOne({ where: { id: Number(id) } });

  if (!rel) return apiError(ApiError.notFound("Relationship not found."));

  const body = await req.json();
  const updated = await repo.save({ ...rel, ...body });

  return apiSuccess({ relationship: updated }, "Relationship updated");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const repo = AppDataSource.getRepository(Relationship);
  const rel = await repo.findOne({ where: { id: Number(id) } });

  if (!rel) return apiError(ApiError.notFound("Relationship not found."));

  const personIdParam = new URL(req.url).searchParams.get("personId");
  const contextPersonId = personIdParam ? Number(personIdParam) : NaN;
  if (
    !Number.isFinite(contextPersonId) ||
    (contextPersonId !== rel.personAId && contextPersonId !== rel.personBId)
  ) {
    return apiError(
      ApiError.badRequest(
        "personId query must be one endpoint of this relationship.",
      ),
    );
  }

  const personRepo = AppDataSource.getRepository(Person);
  const contextPerson = await personRepo.findOne({
    where: { id: contextPersonId },
  });
  if (!contextPerson) {
    return apiError(ApiError.notFound("Context person not found."));
  }
  if (!(await canViewPerson(user, contextPerson))) {
    return apiError(ApiError.forbidden("You cannot view this person."));
  }

  if (await canUnlinkRelationship(user, rel, contextPerson)) {
    await repo.remove(rel);
    return apiSuccess({ removed: true, proposed: false }, "Relationship deleted");
  }

  // Non-privileged viewer: propose removal for review
  let note: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.note === "string" && body.note.trim()) {
      note = body.note.trim();
    }
  } catch {
    // no body is fine
  }

  const peRepo = AppDataSource.getRepository(ProposedEdit);
  const existing = await peRepo.findOne({
    where: {
      kind: ProposedEditKind.REMOVE_RELATIONSHIP,
      relationshipId: rel.id,
      proposedByUserId: user.id,
      status: ProposedEditStatus.PENDING,
    },
  });
  if (existing) {
    return apiSuccess(
      { proposed: true, proposedEditId: existing.id, removed: false },
      "Removal already proposed for review",
      202,
    );
  }

  const pe = await peRepo.save(
    peRepo.create({
      personId: contextPersonId,
      proposedByUserId: user.id,
      kind: ProposedEditKind.REMOVE_RELATIONSHIP,
      relationshipId: rel.id,
      changes: "{}",
      note,
      status: ProposedEditStatus.PENDING,
    }),
  );

  return apiSuccess(
    { proposed: true, proposedEditId: pe.id, removed: false },
    "Removal proposed for review",
    202,
  );
}
