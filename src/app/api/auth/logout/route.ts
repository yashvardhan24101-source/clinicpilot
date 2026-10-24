import { NextResponse } from "next/server";
import { buildExpireSessionCookieHeader } from "@/lib/auth-session";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully",
  });

  response.headers.set("Set-Cookie", buildExpireSessionCookieHeader());

  return response;
}
