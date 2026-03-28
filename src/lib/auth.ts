import { NextRequest } from "next/server";

import { verifyToken } from "@/src/lib/jwt";

export interface AuthUser {
  id: number;
  role?: string;
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) return null;
    const payload = await verifyToken(token);
    const id = typeof payload.id === "number" ? payload.id : Number(payload.id);
    if (!Number.isFinite(id)) return null;
    return { id, role: typeof payload.role === "string" ? payload.role : undefined };
  } catch {
    return null;
  }
}

export async function requireAuth(req: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(req);
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
