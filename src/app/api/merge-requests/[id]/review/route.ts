import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { MergeRequest, MergeRequestStatus, MergeRequestType } from "@/src/api/entities/MergeRequest";
import { Person } from "@/src/api/entities/Person";
import { FamilyTreeMember } from "@/src/api/entities/FamilyTreeMember";
import { XPEventType } from "@/src/api/entities/XPEvent";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { getAuthUser } from "@/src/lib/auth";
import { awardXP } from "@/src/api/services/gamification/gamification.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initializeDataSource();
  const user = getAuthUser(req);
  if (!user || user.role !== "admin") return apiError(ApiError.forbidden("Admin access required."));

  const { id } = await params;
  const repo = AppDataSource.getRepository(MergeRequest);
  const mr = await repo.findOne({ where: { id: Number(id) } });
  if (!mr) return apiError(ApiError.notFound("Merge request not found."));
  if (mr.status !== MergeRequestStatus.PENDING) {
    return apiError(ApiError.badRequest("Only pending merge requests can be reviewed."));
  }

  const body = await req.json();
  const { decision, reviewNotes } = body;

  if (!["approved", "rejected"].includes(decision)) {
    return apiError(ApiError.badRequest("decision must be 'approved' or 'rejected'."));
  }

  mr.status = decision === "approved" ? MergeRequestStatus.APPROVED : MergeRequestStatus.REJECTED;
  mr.reviewedByUserId = user.id;
  mr.reviewNotes = reviewNotes || null;
  mr.reviewedAt = new Date();

  if (decision === "approved") {
    if (mr.type === MergeRequestType.DUPLICATE_PERSON) {
      // Merge duplicate person: move all relationships and events from source to target, then delete source
      await mergeDuplicatePersons(mr.sourcePersonId, mr.targetPersonId);
    } else if (mr.type === MergeRequestType.FAMILY_TREES) {
      // Merge trees: move all members from source tree to target tree
      await mergeFamilyTrees(mr.sourceTreeId, mr.targetTreeId);
    }
  }

  await repo.save(mr);

  // Award XP to the requester when their merge is approved
  if (decision === "approved" && mr.requestedByUserId) {
    await awardXP(mr.requestedByUserId, XPEventType.MERGE_APPROVED, mr.id, "Merge request approved");
  }

  return apiSuccess({ mergeRequest: mr }, `Merge request ${decision}`);
}

async function mergeDuplicatePersons(sourceId: number, targetId: number) {
  const relRepo = AppDataSource.getRepository("Relationship");
  const eventRepo = AppDataSource.getRepository("LifeEvent");
  const personRepo = AppDataSource.getRepository(Person);

  // Re-point relationships
  await relRepo.createQueryBuilder().update().set({ personAId: targetId } as any).where("personAId = :id", { id: sourceId }).execute();
  await relRepo.createQueryBuilder().update().set({ personBId: targetId } as any).where("personBId = :id", { id: sourceId }).execute();

  // Re-point life events
  await eventRepo.createQueryBuilder().update().set({ personId: targetId } as any).where("personId = :id", { id: sourceId }).execute();

  // Delete the source duplicate
  await personRepo.delete(sourceId);
}

async function mergeFamilyTrees(sourceTreeId: number, targetTreeId: number) {
  const memberRepo = AppDataSource.getRepository(FamilyTreeMember);
  const treeRepo = AppDataSource.getRepository("FamilyTree");

  const sourceMembers = await memberRepo.find({ where: { treeId: sourceTreeId } });
  for (const m of sourceMembers) {
    const exists = await memberRepo.findOne({ where: { treeId: targetTreeId, personId: m.personId } });
    if (!exists && m.personId > 0) {
      await memberRepo.save(memberRepo.create({ treeId: targetTreeId, personId: m.personId }));
    }
  }
  // Remove the source tree's members and delete the tree
  await memberRepo.delete({ treeId: sourceTreeId });
  await treeRepo.delete(sourceTreeId);
}
