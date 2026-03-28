import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Clan } from "@/src/api/entities/Clan";
import { XPEventType } from "@/src/api/entities/XPEvent";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { getAuthUser } from "@/src/lib/auth";
import { awardXP } from "@/src/api/services/gamification/gamification.service";

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const repo = AppDataSource.getRepository(Clan);
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";

  const qb = repo.createQueryBuilder("clan");
  if (search) {
    qb.where("clan.name LIKE :s OR clan.totem LIKE :s OR clan.ethnicGroup LIKE :s", { s: `%${search}%` });
  }
  const clans = await qb.orderBy("clan.name", "ASC").getMany();
  return apiSuccess({ clans }, "Clans retrieved");
}

export async function POST(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const body = await req.json();
  const repo = AppDataSource.getRepository(Clan);
  const clan = repo.create({ ...body, createdByUserId: user.id });
  const saved = await repo.save(clan);

  const gamification = await awardXP(user.id, XPEventType.CREATE_CLAN, (saved as any).id, `Created clan: ${body.name}`);

  return apiSuccess({ clan: saved, gamification }, "Clan created", 201);
}
