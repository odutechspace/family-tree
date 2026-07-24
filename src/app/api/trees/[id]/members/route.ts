import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { FamilyTree } from "@/src/api/entities/FamilyTree";
import {
  FamilyTreeMember,
  TreeMemberRole,
} from "@/src/api/entities/FamilyTreeMember";
import {
  AliveStatus,
  Person,
  PersonVisibility,
} from "@/src/api/entities/Person";
import { XPEventType } from "@/src/api/entities/XPEvent";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import { generatePersonCode, tryHashPhone } from "@/src/lib/identity";
import { canEditTree, ensureSteward } from "@/src/lib/permissions";
import { awardXP } from "@/src/api/services/gamification/gamification.service";

type PersonCreateBody = {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  maidenName?: string;
  nickname?: string;
  gender?: string;
  birthDate?: string;
  birthPlace?: string;
  aliveStatus?: string;
  deathDate?: string;
  deathPlace?: string;
  photoUrl?: string;
  biography?: string;
  oralHistory?: string;
  clanId?: number | string;
  tribeEthnicity?: string;
  totem?: string;
  originVillage?: string;
  originCountry?: string;
  phone?: string;
  visibility?: string;
  [key: string]: unknown;
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const treeId = Number(id);
  const treeRepo = AppDataSource.getRepository(FamilyTree);
  const memberRepo = AppDataSource.getRepository(FamilyTreeMember);

  const tree = await treeRepo.findOne({ where: { id: treeId } });

  if (!tree) return apiError(ApiError.notFound("Family tree not found."));
  if (!(await canEditTree(user, tree))) {
    return apiError(
      ApiError.forbidden("Not authorized to edit this tree."),
    );
  }

  const body = await req.json();
  const personPayload = body.person as PersonCreateBody | undefined;
  let personId = body.personId ? Number(body.personId) : undefined;
  let createdPerson: Person | undefined;
  let gamification: unknown;

  if (personPayload && !personId) {
    const firstName = String(personPayload.firstName || "").trim();
    const lastName = String(personPayload.lastName || "").trim();

    if (!firstName || !lastName) {
      return apiError(
        ApiError.badRequest("firstName and lastName are required."),
      );
    }

    const result = await AppDataSource.transaction(async (manager) => {
      const pRepo = manager.getRepository(Person);
      const mRepo = manager.getRepository(FamilyTreeMember);

      let personCode = generatePersonCode();
      for (let attempt = 0; attempt < 5; attempt++) {
        const exists = await pRepo.findOne({ where: { personCode } });
        if (!exists) break;
        personCode = generatePersonCode();
      }

      const { phone, ...rest } = personPayload;
      const phoneHash = phone ? tryHashPhone(String(phone)) : undefined;
      const aliveStatus =
        (rest.aliveStatus as AliveStatus) || AliveStatus.UNKNOWN;

      const person = pRepo.create({
        ...rest,
        firstName,
        lastName,
        personCode,
        ...(phoneHash ? { phoneHash } : {}),
        createdByUserId: user.id,
        visibility:
          (rest.visibility as PersonVisibility) ||
          (aliveStatus === AliveStatus.ALIVE
            ? PersonVisibility.STEWARDS
            : PersonVisibility.CONNECTIONS),
        clanId: rest.clanId ? Number(rest.clanId) : undefined,
      } as Partial<Person>);
      const savedPerson = (await pRepo.save(person)) as unknown as Person;

      const member = mRepo.create({
        treeId,
        personId: savedPerson.id,
        userId: user.id,
        role: TreeMemberRole.EDITOR,
      });
      const savedMember = await mRepo.save(member);

      return { person: savedPerson, member: savedMember };
    });

    createdPerson = result.person;
    personId = result.person.id;

    await ensureSteward(createdPerson.id, user.id, user.id);
    gamification = await awardXP(
      user.id,
      XPEventType.ADD_PERSON,
      createdPerson.id,
      `Added ${createdPerson.firstName} ${createdPerson.lastName}`,
    );

    return apiSuccess(
      { member: result.member, person: createdPerson, gamification },
      "Person created and added to tree",
      201,
    );
  }

  if (!personId) {
    return apiError(
      ApiError.badRequest("personId or person payload is required."),
    );
  }

  const existing = await memberRepo.findOne({
    where: { treeId, personId },
  });

  if (existing) {
    return apiError(ApiError.badRequest("Person is already in this tree."));
  }

  const member = memberRepo.create({
    treeId,
    personId,
    userId: user.id,
    role: TreeMemberRole.EDITOR,
  });
  const saved = await memberRepo.save(member);

  return apiSuccess({ member: saved }, "Person added to tree", 201);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await initializeDataSource();
  const user = await getAuthUser(req);

  if (!user) return apiError(ApiError.unauthorized("Authentication required."));

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const personId = searchParams.get("personId");

  if (!personId)
    return apiError(ApiError.badRequest("personId query param is required."));

  const treeRepo = AppDataSource.getRepository(FamilyTree);
  const memberRepo = AppDataSource.getRepository(FamilyTreeMember);

  const tree = await treeRepo.findOne({ where: { id: Number(id) } });

  if (!tree) return apiError(ApiError.notFound("Family tree not found."));
  if (!(await canEditTree(user, tree))) {
    return apiError(
      ApiError.forbidden("Not authorized to edit this tree."),
    );
  }

  const member = await memberRepo.findOne({
    where: { treeId: Number(id), personId: Number(personId) },
  });

  if (!member) return apiError(ApiError.notFound("Member not found in tree."));

  await memberRepo.remove(member);

  return apiSuccess({}, "Person removed from tree");
}
