import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { requireRole } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const auth = await requireRole(["owner", "receptionist"], request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  let followups = [...serverStore.followups];

  if (role !== "super_admin") {
    followups = followups.filter((f) => (f.clinic_id || "cln-1") === clinicId);
  }

  return NextResponse.json(followups);
}
