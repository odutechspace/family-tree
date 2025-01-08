import { NextResponse } from "next/server";
import { initializeDataSource } from "@/src/config/db";
import { verifyToken } from "@/src/lib/jwt"; // Function to verify JWT tokens

export async function middleware(req: any) {
  // Protect specific routes
  const protectedRoutes = ["/api/protected-route", "/api/users/profile"];
  if (protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))) {
    const token = req.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized. Token is missing." }, { status: 401 });
    }

    try {
      verifyToken(token); // Verify the JWT
      return NextResponse.next(); // Allow request to proceed
    } catch (error) {
      console.error("Invalid token:", error);
      return NextResponse.json({ message: "Unauthorized. Invalid token." }, { status: 401 });
    }
  }

  return NextResponse.next(); // Allow non-protected routes
  // return NextResponse.json({ message: "Unauthorized. Token is missing." }, { status: 401 });
}

export const config = {
  matcher: ["/api/:path*"] // Apply middleware to all API routes
};
