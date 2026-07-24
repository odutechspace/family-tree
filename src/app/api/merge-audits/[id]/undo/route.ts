import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { MergeAudit } from "@/src/api/entities/MergeAudit";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import { undoMerge } from "@/src/api/services/merge.service";

/** POST /api/merge-audits/[id]/undo */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const user = await getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const audit = await AppDataSource.getRepository(MergeAudit).findOne({
    where: { id: Number(id) },
  });
  if (!audit) return apiError(ApiError.notFound("Merge audit not found."));

  if (user.role !== "admin" && audit.performedByUserId !== user.id) {
    return apiError(ApiError.forbidden("Not authorized to undo this merge."));
  }

  try {
    await undoMerge(audit.id, user.id);
  } catch (err) {
    return apiError(
      ApiError.badRequest(
        err instanceof Error ? err.message : "Undo failed.",
      ),
    );
  }

  return apiSuccess({}, "Merge undone");
}
