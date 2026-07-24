import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { MergeRequest } from "@/src/api/entities/MergeRequest";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const { id } = await params;
  const repo = AppDataSource.getRepository(MergeRequest);
  const mr = await repo.findOne({ where: { id: Number(id) } });

  if (!mr) return apiError(ApiError.notFound("Merge request not found."));

  return apiSuccess({ mergeRequest: mr }, "Merge request retrieved");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const repo = AppDataSource.getRepository(MergeRequest);
  const mr = await repo.findOne({ where: { id: Number(id) } });

  if (!mr) return apiError(ApiError.notFound("Merge request not found."));
  if (mr.requestedByUserId !== user.id && user.role !== "admin") {
    return apiError(ApiError.forbidden("Not authorized."));
  }

  await repo.remove(mr);

  return apiSuccess({}, "Merge request cancelled");
}
