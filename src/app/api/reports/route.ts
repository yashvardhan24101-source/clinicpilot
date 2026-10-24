import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { LabReport } from "@/types/api";
import { requireRole, requireSession } from "@/lib/auth-guard";
import { getClinicTodayIST } from "@/lib/date-helpers";

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  let reports = [...serverStore.reports];

  if (role !== "super_admin") {
    reports = reports.filter((r) => (r.clinic_id || "cln-1") === clinicId);
  }

  return NextResponse.json(reports);
}

export async function POST(request: Request) {
  const auth = await requireRole(["owner", "doctor", "receptionist"], request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;

  const body = (await request.json()) as Partial<LabReport>;

  const newReport: LabReport = {
    id: `rep-${Date.now()}`,
    clinic_id: clinicId || "cln-1",
    patient_id: body.patient_id || "pat-1",
    patient_name: body.patient_name || "Patient",
    title: body.title || "Diagnostic Report",
    category: body.category || "x_ray",
    file_name: body.file_name || "report.pdf",
    file_size: body.file_size || "1.2 MB",
    uploaded_at: getClinicTodayIST(),
    sent_to_whatsapp: false,
  };

  serverStore.reports.unshift(newReport);

  return NextResponse.json(newReport, { status: 201 });
}
