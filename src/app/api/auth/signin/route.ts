import { NextRequest } from "next/server";

import { findUserByEmail, validatePassword } from "@/src/api/services/user.service";
import { generateToken } from "@/src/lib/jwt";
import { ApiError } from "@/src/lib/ApiError";
import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { initializeDataSource } from "@/src/config/db";

export async function POST(req: NextRequest) {
  await initializeDataSource();

  const { email, password } = await req.json();

  try {
    const user = await findUserByEmail(email);

    if (!user) {
      throw ApiError.notFound("User not found.");
    }

    const isValidPassword = await validatePassword(password, user.password);

    if (!isValidPassword) {
      throw ApiError.forbidden("Invalid credentials.");
    }

    const token = generateToken(user.id, (user as any).role);

    // Save the token in an HTTP-only cookie
    const response = apiSuccess({ token }, "Successfully Logged In");

    response.cookies.set("token", token, { httpOnly: true, maxAge: 3600 }); // 1 hour

    return response;
  } catch (error: any) {
    return apiError(error);
  }
}
