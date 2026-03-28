import { NextRequest } from "next/server";
import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { FamilyTree } from "@/src/api/entities/FamilyTree";
import { FamilyTreeMember } from "@/src/api/entities/FamilyTreeMember";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initializeDataSource();
  const user = await getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const treeRepo = AppDataSource.getRepository(FamilyTree);
  const memberRepo = AppDataSource.getRepository(FamilyTreeMember);

  const tree = await treeRepo.findOne({ where: { id: Number(id) } });
  if (!tree) return apiError(ApiError.notFound("Family tree not found."));
  if (tree.ownerUserId !== user.id) return apiError(ApiError.forbidden("Not authorized."));

  const body = await req.json();
  const { personId } = body;
  if (!personId) return apiError(ApiError.badRequest("personId is required."));

  const existing = await memberRepo.findOne({ where: { treeId: Number(id), personId: Number(personId) } });
  if (existing) return apiError(ApiError.badRequest("Person is already in this tree."));

  const member = memberRepo.create({ treeId: Number(id), personId: Number(personId), userId: user.id });
  const saved = await memberRepo.save(member);
  return apiSuccess({ member: saved }, "Person added to tree", 201);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initializeDataSource();
  const user = await getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const personId = searchParams.get("personId");
  if (!personId) return apiError(ApiError.badRequest("personId query param is required."));

  const treeRepo = AppDataSource.getRepository(FamilyTree);
  const memberRepo = AppDataSource.getRepository(FamilyTreeMember);

  const tree = await treeRepo.findOne({ where: { id: Number(id) } });
  if (!tree) return apiError(ApiError.notFound("Family tree not found."));
  if (tree.ownerUserId !== user.id) return apiError(ApiError.forbidden("Not authorized."));

  const member = await memberRepo.findOne({ where: { treeId: Number(id), personId: Number(personId) } });
  if (!member) return apiError(ApiError.notFound("Member not found in tree."));

  await memberRepo.remove(member);
  return apiSuccess({}, "Person removed from tree");
}
