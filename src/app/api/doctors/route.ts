import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { requireSession } from "@/lib/auth-guard";
import { withClinicContext } from "@/lib/db/tenant";
import { doctorsRepo } from "@/lib/db/repositories/doctors-repo";

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  const url = new URL(request.url);
  const specialty = url.searchParams.get("specialty");
  const query = url.searchParams.get("q")?.toLowerCase();

  // In DEMO_MODE, serve from in-memory mock store
  if (process.env.DEMO_MODE === "true") {
    let result = [...serverStore.doctors];

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

  // Production Mode: Execute query inside withClinicContext using repository
  return await withClinicContext(clinicId, async (client) => {
    let list = await doctorsRepo.listDoctors(client, clinicId);

    if (specialty && specialty !== "all") {
      list = list.filter((d) =>
        d.specialty.toLowerCase().includes(specialty.toLowerCase())
      );
    }

    if (query) {
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.specialty.toLowerCase().includes(query)
      );
    }

    return NextResponse.json(list);
  });
}
