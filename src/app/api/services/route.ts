import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { requireSession } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  let services = [...serverStore.services];

  if (role !== "super_admin") {
    services = services.filter((s) => (s.clinic_id || "cln-1") === clinicId);
  }

  return NextResponse.json(services);
}
