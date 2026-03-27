import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Person } from "@/src/api/entities/Person";
import { XPEventType } from "@/src/api/entities/XPEvent";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { getAuthUser } from "@/src/lib/auth";
import { awardXP } from "@/src/api/services/gamification/gamification.service";

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const repo = AppDataSource.getRepository(Person);

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const clanId = searchParams.get("clanId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const qb = repo.createQueryBuilder("person");

  if (search) {
    qb.where(
      "CONCAT(person.firstName, ' ', person.lastName) LIKE :search OR person.nickname LIKE :search",
      { search: `%${search}%` }
    );
  }
  if (clanId) {
    qb.andWhere("person.clanId = :clanId", { clanId: Number(clanId) });
  }

  qb.skip((page - 1) * limit).take(limit).orderBy("person.lastName", "ASC");
  const [persons, total] = await qb.getManyAndCount();

  return apiSuccess({ persons, total, page, limit }, "Persons retrieved");
}

export async function POST(req: NextRequest) {
  await initializeDataSource();
  const user = getAuthUser(req);
  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const body = await req.json();
  const repo = AppDataSource.getRepository(Person);

  const person = repo.create({ ...body, createdByUserId: user.id });
  const saved = await repo.save(person) as unknown as Person;

  // Award XP: check for photo and biography bonus events too
  const gamification = await awardXP(user.id, XPEventType.ADD_PERSON, saved.id, `Added ${saved.firstName} ${saved.lastName}`);

  if ((saved as any).photoUrl) {
    await awardXP(user.id, XPEventType.ADD_PHOTO, saved.id);
  }
  if ((saved as any).biography?.trim()) {
    await awardXP(user.id, XPEventType.WRITE_BIOGRAPHY, saved.id);
  }
  if ((saved as any).oralHistory?.trim()) {
    await awardXP(user.id, XPEventType.WRITE_ORAL_HISTORY, saved.id);
  }

  return apiSuccess({ person: saved, gamification }, "Person created", 201);
}
