import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { requireSession } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  const url = new URL(request.url);
  const specialty = url.searchParams.get("specialty");
  const query = url.searchParams.get("q")?.toLowerCase();

  let result = [...serverStore.doctors];

  // Tenant isolation
  if (role !== "super_admin") {
    result = result.filter((d) => (d.clinic_id || "cln-1") === clinicId);
  }

  if (specialty && specialty !== "all") {
    result = result.filter((d) =>
      d.specialty.toLowerCase().includes(specialty.toLowerCase())
    );
  }

  if (query) {
    result = result.filter(
      (d) =>
        d.name.toLowerCase().includes(query) ||
        d.specialty.toLowerCase().includes(query)
    );
  }

  return NextResponse.json(result);
}
