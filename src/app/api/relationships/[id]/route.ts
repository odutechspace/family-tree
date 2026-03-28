import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Relationship } from "@/src/api/entities/Relationship";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";

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

  await repo.remove(rel);

  return apiSuccess({}, "Relationship deleted");
}
