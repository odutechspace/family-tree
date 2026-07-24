import { NextRequest } from "next/server";
import { In } from "typeorm";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import {
  MergeRequest,
  MergeRequestStatus,
} from "@/src/api/entities/MergeRequest";
import { Person } from "@/src/api/entities/Person";
import { FamilyTree } from "@/src/api/entities/FamilyTree";
import { XPEventType } from "@/src/api/entities/XPEvent";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { getAuthUser } from "@/src/lib/auth";
import { awardXP } from "@/src/api/services/gamification/gamification.service";

type PersonSummary = {
  id: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  maidenName?: string | null;
  nickname?: string | null;
};

type TreeSummary = {
  id: number;
  name: string;
};

async function enrichMergeRequests(rows: MergeRequest[]) {
  if (rows.length === 0) return [];

  const personIds = new Set<number>();
  const treeIds = new Set<number>();
  for (const r of rows) {
    if (r.sourcePersonId) personIds.add(r.sourcePersonId);
    if (r.targetPersonId) personIds.add(r.targetPersonId);
    if (r.connectingPersonId) personIds.add(r.connectingPersonId);
    if (r.sourceTreeId) treeIds.add(r.sourceTreeId);
    if (r.targetTreeId) treeIds.add(r.targetTreeId);
  }

  const persons =
    personIds.size > 0
      ? await AppDataSource.getRepository(Person)
          .createQueryBuilder("p")
          .where("p.id IN (:...ids)", { ids: [...personIds] })
          .getMany()
      : [];
  const trees =
    treeIds.size > 0
      ? await AppDataSource.getRepository(FamilyTree).find({
          where: { id: In([...treeIds]) },
          select: ["id", "name"],
        })
      : [];

  const personById = new Map<number, PersonSummary>(
    persons.map((p) => [
      p.id,
      {
        id: p.id,
        firstName: p.firstName,
        middleName: p.middleName,
        lastName: p.lastName,
        maidenName: p.maidenName,
        nickname: p.nickname,
      },
    ]),
  );
  const treeById = new Map<number, TreeSummary>(
    trees.map((t) => [t.id, { id: t.id, name: t.name }]),
  );

  return rows.map((r) => ({
    ...r,
    sourcePerson: r.sourcePersonId
      ? (personById.get(r.sourcePersonId) ?? null)
      : null,
    targetPerson: r.targetPersonId
      ? (personById.get(r.targetPersonId) ?? null)
      : null,
    connectingPerson: r.connectingPersonId
      ? (personById.get(r.connectingPersonId) ?? null)
      : null,
    sourceTree: r.sourceTreeId ? (treeById.get(r.sourceTreeId) ?? null) : null,
    targetTree: r.targetTreeId ? (treeById.get(r.targetTreeId) ?? null) : null,
  }));
}

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const repo = AppDataSource.getRepository(MergeRequest);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as MergeRequestStatus | null;
  const all = searchParams.get("all");

  // Admins can see all; regular users see their own
  const where: any =
    all && user.role === "admin" ? {} : { requestedByUserId: user.id };

  if (status) where.status = status;

  const rows = await repo.find({ where, order: { createdAt: "DESC" } });
  const requests = await enrichMergeRequests(rows);

  return apiSuccess({ requests }, "Merge requests retrieved");
}

export async function POST(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const body = await req.json();
  const {
    type,
    sourcePersonId,
    targetPersonId,
    sourceTreeId,
    targetTreeId,
    reason,
    evidenceNotes,
    connectingPersonId,
  } = body;

  if (!type) return apiError(ApiError.badRequest("type is required."));

  const repo = AppDataSource.getRepository(MergeRequest);
  const mr = repo.create({
    type,
    sourcePersonId,
    targetPersonId,
    sourceTreeId,
    targetTreeId,
    connectingPersonId,
    reason,
    evidenceNotes,
    requestedByUserId: user.id,
    status: MergeRequestStatus.PENDING,
  });
  const saved = await repo.save(mr);

  const gamification = await awardXP(
    user.id,
    XPEventType.SUBMIT_MERGE_REQUEST,
    (saved as any).id,
    "Submitted merge request",
  );

  return apiSuccess(
    { mergeRequest: saved, gamification },
    "Merge request submitted",
    201,
  );
}
