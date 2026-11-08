import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { Patient } from "@/types/api";
import { requireSession, requireRole } from "@/lib/auth-guard";
import { getClinicTodayIST } from "@/lib/date-helpers";
import { withClinicContext } from "@/lib/db/tenant";
import { patientsRepo } from "@/lib/db/repositories/patients-repo";

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.toLowerCase();

  // In DEMO_MODE, serve from in-memory mock store
  if (process.env.DEMO_MODE === "true") {
    let patients = [...serverStore.patients];

    if (role !== "super_admin") {
      patients = patients.filter((p) => (p.clinic_id || "cln-1") === clinicId);
    }

    if (search) {
      patients = patients.filter(
        (p) =>
          p.name.toLowerCase().includes(search) || p.phone.includes(search)
      );
    }

    return NextResponse.json(patients);
  }

  // Production Mode: Execute query inside withClinicContext using repository
  return await withClinicContext(clinicId, async (client) => {
    const rows = await patientsRepo.listPatients(client, clinicId, search || undefined);
    return NextResponse.json(rows);
  });
}

export async function POST(request: Request) {
  const auth = await requireRole(["owner", "receptionist"], request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;

  const body = (await request.json()) as Partial<Patient>;

  // In DEMO_MODE, persist into in-memory store
  if (process.env.DEMO_MODE === "true") {
    const newPatient: Patient = {
      id: `pat-${Date.now()}`,
      clinic_id: clinicId || "cln-1",
      name: body.name || "New Patient",
      phone: body.phone || "+91 99999 00000",
      language: body.language || "en",
      consent_status: body.consent_status || {
        whatsapp_reminders: true,
        marketing: false,
      },
      total_visits: body.total_visits || 1,
      last_visit: getClinicTodayIST(),
      created_at: new Date().toISOString(),
    };

    serverStore.patients.unshift(newPatient);
    return NextResponse.json(newPatient, { status: 201 });
  }

  // Production Mode: Execute createPatient inside withClinicContext
  return await withClinicContext(clinicId, async (client) => {
    const created = await patientsRepo.createPatient(client, clinicId, {
      name: body.name || "New Patient",
      phone: body.phone || "+91 99999 00000",
      gender: body.gender || undefined,
      age: body.age || undefined,
    });
    return NextResponse.json(created, { status: 201 });
  });
}
