import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { User } from "@/src/api/entities/User";
import { Person } from "@/src/api/entities/Person";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";

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

  return apiSuccess({ user }, "Profile retrieved");
}

export async function PATCH(req: NextRequest) {
  await initializeDataSource();
  const auth = await getAuthUser(req);

  if (!auth) return apiError(ApiError.unauthorized("Authentication required."));

  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: { id: auth.id } });

  if (!user) return apiError(ApiError.notFound("User not found."));

  const body = await req.json();
  const { name, profilePhotoUrl, linkedPersonId } = body as {
    name?: string;
    profilePhotoUrl?: string | null;
    linkedPersonId?: number | null;
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

  const updated = await repo.save(user);
  const { password: _, ...safeUser } = updated as any;

  return apiSuccess({ user: safeUser }, "Profile updated");
}
