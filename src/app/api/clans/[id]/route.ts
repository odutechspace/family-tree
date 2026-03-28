import { NextRequest } from "next/server";
import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Clan } from "@/src/api/entities/Clan";
import { Person } from "@/src/api/entities/Person";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initializeDataSource();
  const { id } = await params;
  const repo = AppDataSource.getRepository(Clan);
  const personRepo = AppDataSource.getRepository(Person);

  const clan = await repo.findOne({ where: { id: Number(id) } });
  if (!clan) return apiError(ApiError.notFound("Clan not found."));

  const members = await personRepo.find({ where: { clanId: Number(id) }, take: 50 });
  return apiSuccess({ clan, members }, "Clan retrieved");
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initializeDataSource();
  const user = await getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const repo = AppDataSource.getRepository(Clan);
  const clan = await repo.findOne({ where: { id: Number(id) } });
  if (!clan) return apiError(ApiError.notFound("Clan not found."));

  const body = await req.json();
  const updated = await repo.save({ ...clan, ...body });
  return apiSuccess({ clan: updated }, "Clan updated");
}
