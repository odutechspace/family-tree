import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { User } from "@/src/api/entities/User";
import { Person } from "@/src/api/entities/Person";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import { tryHashPhone } from "@/src/lib/identity";
import {
  formatPersonDisplayName,
  getInitialsFromDisplayName,
  getPersonInitials,
} from "@/src/lib/personDisplayName";
import { isAllowedProfilePhotoUrl } from "@/src/lib/dicebear";

export async function GET(_req: NextRequest) {
  await initializeDataSource();
  const auth = await getAuthUser(_req);

  if (!auth) return apiError(ApiError.unauthorized("Authentication required."));

  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({
    where: { id: auth.id },
    select: [
      "id",
      "name",
      "email",
      "role",
      "profilePhotoUrl",
      "linkedPersonId",
      "createdAt",
      "updatedAt",
    ],
  });

  if (!user) return apiError(ApiError.notFound("User not found."));

  // Heal asymmetric links: Person.linkedUserId set but User.linkedPersonId missing
  if (!user.linkedPersonId) {
    const linkedAsPerson = await AppDataSource.getRepository(Person).findOne({
      where: { linkedUserId: auth.id },
      select: ["id"],
    });
    if (linkedAsPerson) {
      user.linkedPersonId = linkedAsPerson.id;
      await repo.update(user.id, { linkedPersonId: linkedAsPerson.id });
    }
  }

  let displayName = user.name;
  let initials = getInitialsFromDisplayName(user.name);
  let linkedPerson: {
    id: number;
    firstName: string;
    middleName?: string | null;
    lastName: string;
    maidenName?: string | null;
    nickname?: string | null;
  } | null = null;

  if (user.linkedPersonId) {
    const person = await AppDataSource.getRepository(Person).findOne({
      where: { id: user.linkedPersonId },
    });

    if (person) {
      displayName = formatPersonDisplayName(person);
      initials = getPersonInitials(person);
      linkedPerson = {
        id: person.id,
        firstName: person.firstName,
        middleName: person.middleName,
        lastName: person.lastName,
        maidenName: person.maidenName,
        nickname: person.nickname,
      };
    }
  }

  return apiSuccess(
    { user: { ...user, displayName, initials, linkedPerson } },
    "Profile retrieved",
  );
}

export async function PATCH(req: NextRequest) {
  await initializeDataSource();
  const auth = await getAuthUser(req);

  if (!auth) return apiError(ApiError.unauthorized("Authentication required."));

  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: { id: auth.id } });

  if (!user) return apiError(ApiError.notFound("User not found."));

  const body = await req.json();
  const { name, profilePhotoUrl, linkedPersonId, phone } = body as {
    name?: string;
    profilePhotoUrl?: string | null;
    linkedPersonId?: number | null;
    phone?: string;
  };

  if (name !== undefined) {
    const trimmed = typeof name === "string" ? name.trim() : "";

    if (!trimmed) return apiError(ApiError.badRequest("Name cannot be empty."));
    user.name = trimmed;
  }

  if (profilePhotoUrl !== undefined) {
    if (profilePhotoUrl === null || profilePhotoUrl === "") {
      user.profilePhotoUrl = null;
    } else if (typeof profilePhotoUrl === "string") {
      const u = profilePhotoUrl.trim();

      if (!isAllowedProfilePhotoUrl(u)) {
        return apiError(
          ApiError.badRequest(
            "Profile photo must be an http(s) URL or an uploaded image path.",
          ),
        );
      }
      user.profilePhotoUrl = u;
    }
  }

  if (linkedPersonId !== undefined) {
    if (linkedPersonId === null) {
      user.linkedPersonId = null;
    } else {
      const pid = Number(linkedPersonId);

      if (Number.isNaN(pid)) {
        return apiError(ApiError.badRequest("Invalid linked person."));
      }
      const person = await AppDataSource.getRepository(Person).findOne({
        where: { id: pid },
      });

      if (!person)
        return apiError(ApiError.badRequest("That person does not exist."));
      user.linkedPersonId = pid;
      // Keep Person.linkedUserId in sync when claiming via profile
      if (!person.linkedUserId) {
        await AppDataSource.getRepository(Person).update(pid, {
          linkedUserId: auth.id,
        });
      }
    }
  }

  // Phone: hash it, attempt auto-link to a Person record
  if (phone !== undefined && phone !== null) {
    const phoneHash = tryHashPhone(phone);

    if (phoneHash) {
      (user as any).phoneHash = phoneHash;

      if (!user.linkedPersonId) {
        const personRepo = AppDataSource.getRepository(Person);
        const matchingPerson = await personRepo
          .createQueryBuilder("person")
          .where("person.phoneHash = :phoneHash", { phoneHash })
          .andWhere("person.linkedUserId IS NULL")
          .getOne();

        if (matchingPerson) {
          user.linkedPersonId = matchingPerson.id;
          await personRepo.update(matchingPerson.id, { linkedUserId: auth.id });
        }
      }
    }
  }

  const updated = await repo.save(user);
  const { password: _, ...safeUser } = updated as any;

  return apiSuccess({ user: safeUser }, "Profile updated");
}
