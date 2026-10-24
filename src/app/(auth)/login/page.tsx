import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getFeatureFlags } from "@/lib/flags";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";
import { LoginClient } from "./login-client";

export default async function LoginPage() {
  let sessionCookie: string | undefined;
  try {
    const cookieStore = await cookies();
    sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  } catch {
    // Outside server request context (e.g. testing)
  }

  if (sessionCookie) {
    const session = await verifySessionToken(sessionCookie);
    if (session) {
      redirect("/today");
    }
  }

  const flags = getFeatureFlags();
  return <LoginClient flags={flags} />;
}
