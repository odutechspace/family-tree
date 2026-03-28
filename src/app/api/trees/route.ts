import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { FamilyTree } from "@/src/api/entities/FamilyTree";
import {
  FamilyTreeMember,
  TreeMemberRole,
} from "@/src/api/entities/FamilyTreeMember";
import { XPEventType } from "@/src/api/entities/XPEvent";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { getAuthUser } from "@/src/lib/auth";
import { awardXP } from "@/src/api/services/gamification/gamification.service";

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);
  const repo = AppDataSource.getRepository(FamilyTree);
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine");

  if (mine && user) {
    const trees = await repo.find({
      where: { ownerUserId: user.id },
      order: { createdAt: "DESC" },
    });

    return apiSuccess({ trees }, "Your trees retrieved");
  }

  const trees = await repo.find({
    where: { visibility: "public" as any },
    order: { createdAt: "DESC" },
  });

  return apiSuccess({ trees }, "Public trees retrieved");
}

export async function POST(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const body = await req.json();
  const treeRepo = AppDataSource.getRepository(FamilyTree);
  const memberRepo = AppDataSource.getRepository(FamilyTreeMember);

  const tree = treeRepo.create({ ...body, ownerUserId: user.id });
  const saved = (await treeRepo.save(tree)) as unknown as FamilyTree;

  // Add owner as an OWNER member
  const member = memberRepo.create({
    treeId: saved.id,
    userId: user.id,
    personId: 0,
    role: TreeMemberRole.OWNER,
  });

  await memberRepo.save(member);

  const gamification = await awardXP(
    user.id,
    XPEventType.CREATE_TREE,
    saved.id,
    `Created tree: ${body.name}`,
  );

  return apiSuccess({ tree: saved, gamification }, "Family tree created", 201);
}
