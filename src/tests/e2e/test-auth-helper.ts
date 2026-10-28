import fs from "fs";
import path from "path";
import { SignJWT } from "jose";

export function getSessionSecret(): string {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim()) {
    return process.env.SESSION_SECRET.trim();
  }
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    const m = content.match(/SESSION_SECRET=(.*)/);
    if (m && m[1].trim()) {
      return m[1].trim();
    }
  }
  throw new Error(
    "[FATAL ERROR]: SESSION_SECRET environment variable is missing. A valid SESSION_SECRET of at least 32 characters must be set in the environment or in .env.local."
  );
}

export async function createSignedTestToken(payload?: Partial<{
  user_id: string;
  name: string;
  email: string;
  role: string;
  clinic_id: string;
  clinic_name: string;
}>) {
  const secret = getSessionSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  return await new SignJWT({
    user_id: payload?.user_id || "usr-reception-test",
    name: payload?.name || "Priya Sharma",
    email: payload?.email || "reception@smilecraft.in",
    role: payload?.role || "receptionist",
    clinic_id: payload?.clinic_id || "clinic-1",
    clinic_name: payload?.clinic_name || "SmileCraft Dental",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("4h")
    .sign(key);
}
