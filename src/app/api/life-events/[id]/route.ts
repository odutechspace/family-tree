import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { LifeEvent } from "@/src/api/entities/LifeEvent";
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
  const repo = AppDataSource.getRepository(LifeEvent);
  const event = await repo.findOne({ where: { id: Number(id) } });

  if (!event) return apiError(ApiError.notFound("Life event not found."));

  const body = await req.json();
  const updated = await repo.save({ ...event, ...body });

  return apiSuccess({ event: updated }, "Life event updated");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const repo = AppDataSource.getRepository(LifeEvent);
  const event = await repo.findOne({ where: { id: Number(id) } });

  if (!event) return apiError(ApiError.notFound("Life event not found."));

  await repo.remove(event);

  return apiSuccess({}, "Life event deleted");
}
