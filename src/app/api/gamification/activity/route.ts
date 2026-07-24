import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { XPEvent } from "@/src/api/entities/XPEvent";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { getAuthUser } from "@/src/lib/auth";

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const auth = await getAuthUser(req);

  if (!auth) return apiError(ApiError.unauthorized("Authentication required."));

  const repo = AppDataSource.getRepository(XPEvent);
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  const events = await repo.find({
    where: { userId: auth.id },
    order: { createdAt: "DESC" },
    take: limit,
  });

  return apiSuccess({ events }, "Activity retrieved");
}
