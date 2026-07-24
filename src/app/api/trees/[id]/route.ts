import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { FamilyTree } from "@/src/api/entities/FamilyTree";
import { FamilyTreeMember } from "@/src/api/entities/FamilyTreeMember";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import { getRelatives } from "@/src/api/services/graph/relatives.service";
import {
  canEditTree,
  canManageTree,
  getTreeMembership,
} from "@/src/lib/permissions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const { id } = await params;
  const auth = await getAuthUser(req);

  const treeRepo = AppDataSource.getRepository(FamilyTree);
  const memberRepo = AppDataSource.getRepository(FamilyTreeMember);

  const tree = await treeRepo.findOne({ where: { id: Number(id) } });

  if (!tree) return apiError(ApiError.notFound("Family tree not found."));

  const members = await memberRepo.find({ where: { treeId: Number(id) } });
  const memberPersonIds = members
    .filter((m) => m.personId > 0)
    .map((m) => m.personId);

  let myRole: string | null = null;
  let canEdit = false;
  let canManage = false;
  let isCollaborator = false;

  if (auth) {
    const membership = await getTreeMembership(tree.id, auth.id);
    myRole = membership?.role ?? (tree.ownerUserId === auth.id ? "owner" : null);
    canEdit = await canEditTree(auth, tree);
    canManage = await canManageTree(auth, tree);
    isCollaborator = membership != null || canEdit;
  }

  // Tree collaborators see every direct member of the shared tree, even people
  // added by others whose per-person visibility would otherwise hide them.
  const relatives = await getRelatives(memberPersonIds, {
    viewerUserId: auth?.id,
    viewerRole: auth?.role,
    alwaysVisibleIds: isCollaborator ? memberPersonIds : undefined,
  });

  const persons = relatives.nodes.map((n) => n.person);
  const relationships = relatives.edges.map((e) => e.relationship);

  return apiSuccess(
    {
      tree,
      members,
      persons,
      relationships,
      myRole,
      canEdit,
      canManage,
    },
    "Tree data retrieved",
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const repo = AppDataSource.getRepository(FamilyTree);
  const tree = await repo.findOne({ where: { id: Number(id) } });

  if (!tree) return apiError(ApiError.notFound("Family tree not found."));
  if (!(await canManageTree(user, tree)))
    return apiError(ApiError.forbidden("Not authorized."));

  const body = await req.json();
  const next: Partial<FamilyTree> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return apiError(ApiError.badRequest("Name is required."));
    next.name = name;
  }
  if (typeof body.description === "string" || body.description === null) {
    next.description =
      typeof body.description === "string" ? body.description : null;
  }
  if (typeof body.visibility === "string") {
    next.visibility = body.visibility as FamilyTree["visibility"];
  }
  if (Object.keys(next).length === 0) {
    return apiError(ApiError.badRequest("No valid fields to update."));
  }

  const updated = await repo.save({ ...tree, ...next });

  return apiSuccess({ tree: updated }, "Tree updated");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const repo = AppDataSource.getRepository(FamilyTree);
  const tree = await repo.findOne({ where: { id: Number(id) } });

  if (!tree) return apiError(ApiError.notFound("Family tree not found."));
  if (!(await canManageTree(user, tree)))
    return apiError(ApiError.forbidden("Not authorized."));

  await repo.remove(tree);

  return apiSuccess({}, "Tree deleted");
}
