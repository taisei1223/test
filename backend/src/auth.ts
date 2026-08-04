import jwt from "jsonwebtoken";
import { env } from "./env";

export interface JwtPayload {
  sub: string;
  email: string;
  // Stored as a plain string in SQLite (no native enum support); the set of
  // valid values ("customer" | "trainer") is enforced by zod at write time.
  role: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
