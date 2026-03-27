import { NextRequest } from "next/server";
import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { MergeRequest, MergeRequestStatus } from "@/src/api/entities/MergeRequest";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const user = getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const repo = AppDataSource.getRepository(MergeRequest);
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as MergeRequestStatus | null;
  const all = searchParams.get("all");

  // Admins can see all; regular users see their own
  const where: any = all && user.role === "admin" ? {} : { requestedByUserId: user.id };
  if (status) where.status = status;

  const requests = await repo.find({ where, order: { createdAt: "DESC" } });
  return apiSuccess({ requests }, "Merge requests retrieved");
}

export async function POST(req: NextRequest) {
  await initializeDataSource();
  const user = getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const body = await req.json();
  const { type, sourcePersonId, targetPersonId, sourceTreeId, targetTreeId, reason, evidenceNotes, connectingPersonId } = body;

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
  return apiSuccess({ mergeRequest: saved }, "Merge request submitted", 201);
}
