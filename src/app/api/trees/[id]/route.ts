import { NextRequest } from "next/server";
import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { FamilyTree } from "@/src/api/entities/FamilyTree";
import { FamilyTreeMember } from "@/src/api/entities/FamilyTreeMember";
import { Person } from "@/src/api/entities/Person";
import { Relationship } from "@/src/api/entities/Relationship";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initializeDataSource();
  const { id } = await params;

  const treeRepo = AppDataSource.getRepository(FamilyTree);
  const memberRepo = AppDataSource.getRepository(FamilyTreeMember);
  const personRepo = AppDataSource.getRepository(Person);
  const relRepo = AppDataSource.getRepository(Relationship);

  const tree = await treeRepo.findOne({ where: { id: Number(id) } });
  if (!tree) return apiError(ApiError.notFound("Family tree not found."));

  const members = await memberRepo.find({ where: { treeId: Number(id) } });
  const personIds = members.filter((m) => m.personId > 0).map((m) => m.personId);

  let persons: Person[] = [];
  let relationships: Relationship[] = [];

  if (personIds.length > 0) {
    persons = await personRepo
      .createQueryBuilder("p")
      .where("p.id IN (:...ids)", { ids: personIds })
      .getMany();

    relationships = await relRepo
      .createQueryBuilder("r")
      .where("r.personAId IN (:...ids) AND r.personBId IN (:...ids)", { ids: personIds })
      .getMany();
  }

  return apiSuccess({ tree, members, persons, relationships }, "Tree data retrieved");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initializeDataSource();
  const user = getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const repo = AppDataSource.getRepository(FamilyTree);
  const tree = await repo.findOne({ where: { id: Number(id) } });
  if (!tree) return apiError(ApiError.notFound("Family tree not found."));
  if (tree.ownerUserId !== user.id) return apiError(ApiError.forbidden("Not authorized."));

  const body = await req.json();
  const updated = await repo.save({ ...tree, ...body });
  return apiSuccess({ tree: updated }, "Tree updated");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initializeDataSource();
  const user = getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const repo = AppDataSource.getRepository(FamilyTree);
  const tree = await repo.findOne({ where: { id: Number(id) } });
  if (!tree) return apiError(ApiError.notFound("Family tree not found."));
  if (tree.ownerUserId !== user.id) return apiError(ApiError.forbidden("Not authorized."));

  await repo.remove(tree);
  return apiSuccess({}, "Tree deleted");
}
