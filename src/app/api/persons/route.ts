import { NextRequest } from "next/server";
import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Person } from "@/src/api/entities/Person";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";

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
  const saved = await repo.save(person);
  return apiSuccess({ person: saved }, "Person created", 201);
}
