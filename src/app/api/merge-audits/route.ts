import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { MergeAudit } from "@/src/api/entities/MergeAudit";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";

/** GET /api/merge-audits — recent merges (admin) */
export async function GET(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));
  if (user.role !== "admin") {
    return apiError(ApiError.forbidden("Admin access required."));
  }

  const audits = await AppDataSource.getRepository(MergeAudit).find({
    order: { createdAt: "DESC" },
    take: 50,
  });

  return apiSuccess({ audits }, "Merge audits retrieved");
}
