import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { Person } from "@/src/api/entities/Person";
import { PersonSteward } from "@/src/api/entities/PersonSteward";
import { User } from "@/src/api/entities/User";
import { Relationship } from "@/src/api/entities/Relationship";
import { LifeEvent } from "@/src/api/entities/LifeEvent";
import {
  ProposedEdit,
  ProposedEditKind,
  ProposedEditStatus,
} from "@/src/api/entities/ProposedEdit";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import { tryHashPhone } from "@/src/lib/identity";
import { canEditPerson, canUnlinkRelationship, canViewPerson } from "@/src/lib/permissions";

const ALLOWED_PROPOSE_FIELDS = new Set([
  "firstName",
  "middleName",
  "lastName",
  "maidenName",
  "nickname",
  "gender",
  "birthDate",
  "birthPlace",
  "aliveStatus",
  "deathDate",
  "deathPlace",
  "photoUrl",
  "biography",
  "oralHistory",
  "clanId",
  "tribeEthnicity",
  "totem",
  "originVillage",
  "originCountry",
  "visibility",
  "isPrivate",
]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const auth = await getAuthUser(req);
  const { id } = await params;
  const personRepo = AppDataSource.getRepository(Person);
  const relRepo = AppDataSource.getRepository(Relationship);
  const eventRepo = AppDataSource.getRepository(LifeEvent);

  const person = await personRepo.findOne({ where: { id: Number(id) } });

  if (!person) return apiError(ApiError.notFound("Person not found."));

  if (!(await canViewPerson(auth, person))) {
    return apiError(ApiError.forbidden("You cannot view this person."));
  }

  const canEdit = auth ? await canEditPerson(auth, person) : false;
  let publicPerson: Record<string, unknown> = { ...person };
  if (!canEdit && auth) {
    // Strip phone-derived identity for non-editors
    const { phoneHash: _ph, ...rest } = publicPerson as any;
    publicPerson = rest;
  }

  const relationships = await relRepo.find({
    where: [{ personAId: Number(id) }, { personBId: Number(id) }],
  });
  const lifeEvents = await eventRepo.find({
    where: { personId: Number(id) },
    order: { eventDate: "ASC" },
  });

  const isStewardOf =
    auth != null &&
    (await AppDataSource.getRepository(PersonSteward).findOne({
      where: { personId: Number(id), userId: auth.id },
    }));

  const relationshipsWithFlags = await Promise.all(
    relationships.map(async (rel) => ({
      ...rel,
      canUnlink: auth
        ? await canUnlinkRelationship(auth, rel, person)
        : false,
    })),
  );

  return apiSuccess(
    {
      person: publicPerson,
      relationships: relationshipsWithFlags,
      lifeEvents,
      canEdit,
      isSteward: !!isStewardOf || auth?.role === "admin",
    },
    "Person retrieved",
  );
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
  const { phone, note, ...rest } = body as {
    phone?: string;
    note?: string;
    [key: string]: unknown;
  };

  if (!(await canEditPerson(user, person))) {
    // Phase 3: create proposed edit
    const changes: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (ALLOWED_PROPOSE_FIELDS.has(k)) changes[k] = v;
    }
    if (Object.keys(changes).length === 0) {
      return apiError(ApiError.badRequest("No valid fields to propose."));
    }
    const peRepo = AppDataSource.getRepository(ProposedEdit);
    const pe = await peRepo.save(
      peRepo.create({
        personId: person.id,
        proposedByUserId: user.id,
        kind: ProposedEditKind.FIELD_EDIT,
        relationshipId: null,
        changes: JSON.stringify(changes),
        note: typeof note === "string" ? note : null,
        status: ProposedEditStatus.PENDING,
      }),
    );
    return apiSuccess(
      { proposed: true, proposedEditId: pe.id },
      "Edit proposed for steward review",
      202,
    );
  }

  const phoneHash = phone ? tryHashPhone(phone) : undefined;

  const updated = (await repo.save({
    ...person,
    ...rest,
    ...(phoneHash !== undefined ? { phoneHash } : {}),
    personCode: person.personCode,
    createdByUserId: person.createdByUserId,
  } as any)) as unknown as Person;

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

  return apiSuccess({ person: updated, proposed: false }, "Person updated");
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

  if (!(await canEditPerson(user, person))) {
    return apiError(ApiError.forbidden("Not authorized to delete this person."));
  }

  await repo.remove(person);

  return apiSuccess({}, "Person deleted");
}
