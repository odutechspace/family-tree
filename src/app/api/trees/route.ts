import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { FamilyTree } from "@/src/api/entities/FamilyTree";
import {
  FamilyTreeMember,
  TreeMemberRole,
} from "@/src/api/entities/FamilyTreeMember";
import { User } from "@/src/api/entities/User";
import { XPEventType } from "@/src/api/entities/XPEvent";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { getAuthUser } from "@/src/lib/auth";
import { awardXP } from "@/src/api/services/gamification/gamification.service";

async function withCreators(trees: FamilyTree[]) {
  if (trees.length === 0) return [];

  const ownerIds = [...new Set(trees.map((t) => t.ownerUserId).filter(Boolean))];
  const owners =
    ownerIds.length > 0
      ? await AppDataSource.getRepository(User)
          .createQueryBuilder("u")
          .select(["u.id", "u.name"])
          .where("u.id IN (:...ids)", { ids: ownerIds })
          .getMany()
      : [];
  const byId = new Map(owners.map((u) => [u.id, u.name]));

  return trees.map((t) => ({
    ...t,
    createdBy: {
      id: t.ownerUserId,
      name: byId.get(t.ownerUserId) || `User #${t.ownerUserId}`,
    },
  }));
}

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);
  const repo = AppDataSource.getRepository(FamilyTree);
  const { searchParams } = new URL(req.url);
  const mine = searchParams.get("mine");

  if (mine && user) {
    // Owned trees + trees where the user is a collaborator (e.g. after invite accept)
    const me = await AppDataSource.getRepository(User).findOne({
      where: { id: user.id },
      select: ["id", "linkedPersonId"],
    });

    const memberQb = AppDataSource.getRepository(FamilyTreeMember)
      .createQueryBuilder("m")
      .where("m.userId = :userId", { userId: user.id });
    if (me?.linkedPersonId) {
      memberQb.orWhere("m.personId = :personId", {
        personId: me.linkedPersonId,
      });
    }
    const memberRows = await memberQb.getMany();
    const memberTreeIds = [
      ...new Set(memberRows.map((m) => m.treeId).filter(Boolean)),
    ];
    const roleByTreeId = new Map(
      memberRows.map((m) => [m.treeId, m.role] as const),
    );

    const owned = await repo.find({
      where: { ownerUserId: user.id },
      order: { createdAt: "DESC" },
    });

    let memberTrees: FamilyTree[] = [];
    if (memberTreeIds.length > 0) {
      const ownedIds = new Set(owned.map((t) => t.id));
      const onlyMemberIds = memberTreeIds.filter((id) => !ownedIds.has(id));
      if (onlyMemberIds.length > 0) {
        memberTrees = await repo
          .createQueryBuilder("t")
          .where("t.id IN (:...ids)", { ids: onlyMemberIds })
          .orderBy("t.createdAt", "DESC")
          .getMany();
      }
    }

    const trees = (await withCreators([...owned, ...memberTrees])).map((t) => ({
      ...t,
      myRole:
        t.ownerUserId === user.id
          ? TreeMemberRole.OWNER
          : (roleByTreeId.get(t.id) ?? TreeMemberRole.VIEWER),
    }));

    // Newest first across both sets
    trees.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return apiSuccess({ trees }, "Your trees retrieved");
  }

  const publicTrees = await repo.find({
    where: { visibility: "public" as any },
    order: { createdAt: "DESC" },
  });
  const trees = await withCreators(publicTrees);

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
