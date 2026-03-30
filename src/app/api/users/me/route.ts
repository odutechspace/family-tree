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

  let displayName = user.name;
  let initials = getInitialsFromDisplayName(user.name);

  if (user.linkedPersonId) {
    const person = await AppDataSource.getRepository(Person).findOne({
      where: { id: user.linkedPersonId },
    });

    if (person) {
      displayName = formatPersonDisplayName(person);
      initials = getPersonInitials(person);
    }
  }

  return apiSuccess(
    { user: { ...user, displayName, initials } },
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

      user.profilePhotoUrl = u || null;
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
