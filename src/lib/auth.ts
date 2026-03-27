import { NextRequest } from "next/server";
import { verifyToken } from "@/src/lib/jwt";

export interface AuthUser {
  id: number;
  role?: string;
}

export function getAuthUser(req: NextRequest): AuthUser | null {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return null;
    const payload = verifyToken(token) as any;
    return { id: payload.id, role: payload.role };
  } catch {
    return null;
  }
}

export function requireAuth(req: NextRequest): AuthUser {
  const user = getAuthUser(req);
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
