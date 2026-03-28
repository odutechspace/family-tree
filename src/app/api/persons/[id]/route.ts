import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Person } from "@/src/api/entities/Person";
import { User } from "@/src/api/entities/User";
import { Relationship } from "@/src/api/entities/Relationship";
import { LifeEvent } from "@/src/api/entities/LifeEvent";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import { tryHashPhone } from "@/src/lib/identity";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const { id } = await params;
  const personRepo = AppDataSource.getRepository(Person);
  const relRepo = AppDataSource.getRepository(Relationship);
  const eventRepo = AppDataSource.getRepository(LifeEvent);

  const person = await personRepo.findOne({ where: { id: Number(id) } });

  if (!person) return apiError(ApiError.notFound("Person not found."));

  const relationships = await relRepo.find({
    where: [{ personAId: Number(id) }, { personBId: Number(id) }],
  });
  const lifeEvents = await eventRepo.find({
    where: { personId: Number(id) },
    order: { eventDate: "ASC" },
  });

  return apiSuccess({ person, relationships, lifeEvents }, "Person retrieved");
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const repo = AppDataSource.getRepository(Person);
  const person = await repo.findOne({ where: { id: Number(id) } });

  if (!person) return apiError(ApiError.notFound("Person not found."));

  const body = await req.json();

  // Handle phone: hash it, never persist plaintext
  const { phone, ...rest } = body as { phone?: string; [key: string]: unknown };
  const phoneHash = phone ? tryHashPhone(phone) : undefined;

  const updated = (await repo.save({
    ...person,
    ...rest,
    ...(phoneHash !== undefined ? { phoneHash } : {}),
    // Never allow overwriting personCode or createdByUserId via PATCH
    personCode: person.personCode,
    createdByUserId: person.createdByUserId,
  } as any)) as unknown as Person;

  // If a new phone was given, attempt auto-link
  if (phoneHash && !updated.linkedUserId) {
    const userRepo = AppDataSource.getRepository(User);
    const matchingUser = await userRepo.findOne({ where: { phoneHash } });

    if (matchingUser) {
      await repo.update(updated.id, { linkedUserId: matchingUser.id });
      if (!matchingUser.linkedPersonId) {
        await userRepo.update(matchingUser.id, { linkedPersonId: updated.id });
      }
    }
  }

  return apiSuccess({ person: updated }, "Person updated");
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const repo = AppDataSource.getRepository(Person);
  const person = await repo.findOne({ where: { id: Number(id) } });

  if (!person) return apiError(ApiError.notFound("Person not found."));

  await repo.remove(person);

  return apiSuccess({}, "Person deleted");
}
