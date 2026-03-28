import * as jose from "jose";

function getSecretKey(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
}

export async function generateToken(userId: number, role?: string): Promise<string> {
  return await new jose.SignJWT({
    id: userId,
    role: role || "user",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<jose.JWTPayload> {
  const { payload } = await jose.jwtVerify(token, getSecretKey(), {
    algorithms: ["HS256"],
  });
  return payload;
}
