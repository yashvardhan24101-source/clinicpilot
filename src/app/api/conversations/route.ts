import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { requireRole } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const auth = await requireRole(["owner", "receptionist"], request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  // Rule G.2.2: Mock fixtures are strictly gated to DEMO_MODE=true.
  // In production (DEMO_MODE=false), withhold mock fixture data until a real integration exists.
  const isDemo =
    process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  if (!isDemo) {
    return NextResponse.json([]);
  }

  const url = new URL(request.url);
  const state = url.searchParams.get("state");

  let conversations = [...serverStore.conversations];

  // Clinic isolation
  if (role !== "super_admin") {
    conversations = conversations.filter(
      (c) => (c.clinic_id || "cln-1") === clinicId
    );
  }

  if (state && state !== "all") {
    conversations = conversations.filter((c) => c.state === state);
  }

  return NextResponse.json(conversations);
}
