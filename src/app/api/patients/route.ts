import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { Patient } from "@/types/api";
import { requireSession, requireRole } from "@/lib/auth-guard";
import { getClinicTodayIST } from "@/lib/date-helpers";

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.toLowerCase();

  let patients = [...serverStore.patients];

  // Tenant isolation
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

export async function POST(request: Request) {
  const auth = await requireRole(["owner", "receptionist"], request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;

  const body = (await request.json()) as Partial<Patient>;

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
