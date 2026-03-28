import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Person } from "@/src/api/entities/Person";
import { User } from "@/src/api/entities/User";
import { XPEventType } from "@/src/api/entities/XPEvent";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { getAuthUser } from "@/src/lib/auth";
import { awardXP } from "@/src/api/services/gamification/gamification.service";
import { generatePersonCode, tryHashPhone } from "@/src/lib/identity";

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const repo = AppDataSource.getRepository(Person);

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const code = searchParams.get("code") || "";
  const clanId = searchParams.get("clanId");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  // Direct code lookup — returns a single person
  if (code) {
    const person = await repo.findOne({
      where: { personCode: code.trim().toUpperCase() },
    });

    if (!person)
      return apiError(ApiError.notFound("No person found with that code."));

    return apiSuccess(
      { persons: [person], total: 1, page: 1, limit: 1 },
      "Person found by code",
    );
  }

  const qb = repo.createQueryBuilder("person");

  if (search) {
    qb.where(
      "CONCAT(person.firstName, ' ', person.lastName) LIKE :search OR person.nickname LIKE :search",
      { search: `%${search}%` },
    );
  }
  if (clanId) {
    qb.andWhere("person.clanId = :clanId", { clanId: Number(clanId) });
  }

  qb.skip((page - 1) * limit)
    .take(limit)
    .orderBy("person.lastName", "ASC");
  const [persons, total] = await qb.getManyAndCount();

  return apiSuccess({ persons, total, page, limit }, "Persons retrieved");
}

export async function POST(req: NextRequest) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const body = await req.json();
  const repo = AppDataSource.getRepository(Person);
  const userRepo = AppDataSource.getRepository(User);

  // Generate a unique personCode (retry on collision, though collision is astronomically unlikely)
  let personCode = generatePersonCode();

  for (let attempt = 0; attempt < 5; attempt++) {
    const exists = await repo.findOne({ where: { personCode } });

    if (!exists) break;
    personCode = generatePersonCode();
  }

  // Hash phone if provided — never store plaintext
  const { phone, ...rest } = body as { phone?: string; [key: string]: unknown };
  const phoneHash = phone ? tryHashPhone(phone) : undefined;

  const person = repo.create({
    ...rest,
    personCode,
    ...(phoneHash ? { phoneHash } : {}),
    createdByUserId: user.id,
  });
  const saved = (await repo.save(person)) as unknown as Person;

  // Auto-link: if the logged-in user has a phoneHash and it matches, link immediately
  if (phoneHash) {
    const matchingUser = await userRepo.findOne({ where: { phoneHash } });

    if (matchingUser && !saved.linkedUserId) {
      await repo.update(saved.id, { linkedUserId: matchingUser.id });
      if (!matchingUser.linkedPersonId) {
        await userRepo.update(matchingUser.id, { linkedPersonId: saved.id });
      }
    }
  }

  // Also check if creating user has a phoneHash that matches
  if (!saved.linkedUserId) {
    const creatingUser = await userRepo.findOne({
      where: { id: user.id },
      select: ["id", "phoneHash", "linkedPersonId"],
    });

    if (creatingUser?.phoneHash && creatingUser.phoneHash === phoneHash) {
      await repo.update(saved.id, { linkedUserId: user.id });
      if (!creatingUser.linkedPersonId) {
        await userRepo.update(user.id, { linkedPersonId: saved.id });
      }
    }
  }

  // Award XP
  const gamification = await awardXP(
    user.id,
    XPEventType.ADD_PERSON,
    saved.id,
    `Added ${saved.firstName} ${saved.lastName}`,
  );

  if ((saved as any).photoUrl) {
    await awardXP(user.id, XPEventType.ADD_PHOTO, saved.id);
  }
  if ((saved as any).biography?.trim()) {
    await awardXP(user.id, XPEventType.WRITE_BIOGRAPHY, saved.id);
  }
  if ((saved as any).oralHistory?.trim()) {
    await awardXP(user.id, XPEventType.WRITE_ORAL_HISTORY, saved.id);
  }

  // Return the refreshed person (with personCode and possible linkedUserId)
  const refreshed = (await repo.findOne({ where: { id: saved.id } })) ?? saved;

  return apiSuccess({ person: refreshed, gamification }, "Person created", 201);
}
