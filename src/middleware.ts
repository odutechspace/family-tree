import { NextRequest, NextResponse } from "next/server";

import { verifyToken } from "@/src/lib/jwt";

function safeRedirectPath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value;

  if (!token) return NextResponse.next();

  try {
    await verifyToken(token);
  } catch {
    const res = NextResponse.next();

    res.cookies.delete("token");

    return res;
  }

  const redirect =
    safeRedirectPath(req.nextUrl.searchParams.get("redirect")) ?? "/dashboard";

  return NextResponse.redirect(new URL(redirect, req.url));
}

export const config = {
  matcher: ["/auth/login", "/auth/register"],
};
