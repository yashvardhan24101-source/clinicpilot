import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { requireSession } from "@/lib/auth-guard";
import { withClinicContext } from "@/lib/db/tenant";
import { servicesRepo } from "@/lib/db/repositories/services-repo";

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  // In DEMO_MODE, serve from in-memory mock store
  if (process.env.DEMO_MODE === "true") {
    let services = [...serverStore.services];

    if (role !== "super_admin") {
      services = services.filter((s) => (s.clinic_id || "cln-1") === clinicId);
    }

    return NextResponse.json(services);
  }

  // Production Mode: Execute query inside withClinicContext using repository
  return await withClinicContext(clinicId, async (client) => {
    const list = await servicesRepo.listServices(client, clinicId);
    return NextResponse.json(list);
  });
}
