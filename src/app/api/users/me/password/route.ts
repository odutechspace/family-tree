import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";

import { initializeDataSource, AppDataSource } from "@/src/config/db";
import { User } from "@/src/api/entities/User";
import { apiSuccess, apiError } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";
import { validatePassword } from "@/src/api/services/user.service";

export async function POST(req: NextRequest) {
  await initializeDataSource();
  const auth = await getAuthUser(req);

  if (!auth) return apiError(ApiError.unauthorized("Authentication required."));

  const body = await req.json();
  const { currentPassword, newPassword } = body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return apiError(
      ApiError.badRequest("Current password and new password are required."),
    );
  }
  if (newPassword.length < 8) {
    return apiError(
      ApiError.badRequest("New password must be at least 8 characters."),
    );
  }

  const repo = AppDataSource.getRepository(User);
  const user = await repo.findOne({ where: { id: auth.id } });

  if (!user) return apiError(ApiError.notFound("User not found."));

  const valid = await validatePassword(currentPassword, user.password);

  if (!valid)
    return apiError(ApiError.forbidden("Current password is incorrect."));

  user.password = await bcrypt.hash(newPassword, 10);
  await repo.save(user);

  return apiSuccess(null, "Password updated");
}
