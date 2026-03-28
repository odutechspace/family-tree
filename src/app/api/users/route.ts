import { NextRequest } from "next/server";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { User, UserRole } from "@/src/api/entities/User";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";

// Admin only — list all users
export async function GET(req: NextRequest) {
  await initializeDataSource();
  const auth = await getAuthUser(req);

  if (!auth || auth.role !== "admin")
    return apiError(ApiError.forbidden("Admin access required."));

  const repo = AppDataSource.getRepository(User);
  const users = await repo.find({
    select: ["id", "name", "email", "role", "profilePhotoUrl", "createdAt"],
    order: { createdAt: "DESC" },
  });

  return apiSuccess({ users }, "Users retrieved");
}

// Admin only — update user role
export async function PATCH(req: NextRequest) {
  await initializeDataSource();
  const auth = await getAuthUser(req);

  if (!auth || auth.role !== "admin")
    return apiError(ApiError.forbidden("Admin access required."));

  const body = await req.json();
  const { userId, role } = body;

  if (!userId || !role)
    return apiError(ApiError.badRequest("userId and role are required."));
  if (!Object.values(UserRole).includes(role))
    return apiError(ApiError.badRequest("Invalid role."));

  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: { id: userId } });

  if (!user) return apiError(ApiError.notFound("User not found."));

  user.role = role;
  await repo.save(user);

  return apiSuccess({}, "User role updated");
}
