import { NextRequest } from "next/server";
import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { User } from "@/src/api/entities/User";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";

export async function GET(req: NextRequest) {
  await initializeDataSource();
  const auth = getAuthUser(req);
  if (!auth) return apiError(ApiError.unauthorized("Authentication required."));

  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: { id: auth.id }, select: ["id", "name", "email", "role", "profilePhotoUrl", "linkedPersonId", "createdAt"] });
  if (!user) return apiError(ApiError.notFound("User not found."));
  return apiSuccess({ user }, "Profile retrieved");
}

export async function PATCH(req: NextRequest) {
  await initializeDataSource();
  const auth = getAuthUser(req);
  if (!auth) return apiError(ApiError.unauthorized("Authentication required."));

  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: { id: auth.id } });
  if (!user) return apiError(ApiError.notFound("User not found."));

  const body = await req.json();
  const { name, profilePhotoUrl, linkedPersonId } = body;
  if (name) user.name = name;
  if (profilePhotoUrl) user.profilePhotoUrl = profilePhotoUrl;
  if (linkedPersonId !== undefined) user.linkedPersonId = linkedPersonId;

  const updated = await repo.save(user);
  const { password: _, ...safeUser } = updated as any;
  return apiSuccess({ user: safeUser }, "Profile updated");
}
