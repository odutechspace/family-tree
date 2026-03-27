import jwt from "jsonwebtoken";

const SECRET_KEY = process.env.JWT_SECRET || "your-secret-key";

export const generateToken = (userId: number, role?: string) => {
  return jwt.sign({ id: userId, role: role || "user" }, SECRET_KEY, { expiresIn: "24h" });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, SECRET_KEY);
};
