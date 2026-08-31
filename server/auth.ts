import bcryptjs from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

const isProduction = process.env.NODE_ENV === "production";
const jwtSecretValue = process.env.JWT_SECRET || (isProduction ? "" : "aird_development_jwt_secret_change_in_production_2026");

if (!process.env.JWT_SECRET) {
  if (isProduction) {
    throw new Error("FATAL: JWT_SECRET environment variable is missing in production environment!");
  } else {
    console.warn("⚠️ [Auth] Notice: JWT_SECRET not found in .env. Using fallback development secret.");
  }
}
const JWT_SECRET = new TextEncoder().encode(jwtSecretValue);


export async function hashPassword(password: string): Promise<string> {
  const salt = await bcryptjs.genSalt(12);
  return bcryptjs.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export async function createJWT(userId: number, email: string, role: string, tokenGen: number = 0): Promise<string> {
  const token = await new SignJWT({
    userId,
    email,
    role,
    tokenGen,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("24h")
    .sign(JWT_SECRET);

  return token;
}

export async function verifyJWT(token: string): Promise<{ userId: number; email: string; role: string; tokenGen?: number } | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as { userId: number; email: string; role: string; tokenGen?: number };
  } catch (error) {
    return null;
  }
}
