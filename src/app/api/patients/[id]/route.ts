import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { PatientProfile } from "@/types/api";
import { requireSession, requireRole } from "@/lib/auth-guard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  const { id } = await params;
  const patient = serverStore.patients.find((p) => p.id === id);

  // Clinic isolation: prevent guessing IDs across clinics
  if (
    !patient ||
    (role !== "super_admin" && (patient.clinic_id || "cln-1") !== clinicId)
  ) {
    return NextResponse.json(
      { error: "Patient not found" },
      { status: 404 }
    );
  }

  // Find appointment history for this clinic
  let aptHistory = serverStore.appointments.filter(
    (a) =>
      a.patient_id === id &&
      (role === "super_admin" || (a.clinic_id || "cln-1") === clinicId)
  );

  // If doctor, only see their own appointments in history
  if (role === "doctor") {
    const doctorName = session.name || "";
    const doctorUserId = session.user_id || "";
    aptHistory = aptHistory.filter(
      (a) =>
        a.doctor_id === doctorUserId ||
        (doctorName && a.doctor_name.toLowerCase().includes(doctorName.toLowerCase()))
    );
  }

  const profile: PatientProfile = {
    ...patient,
    appointment_history: aptHistory,
  };

  return NextResponse.json(profile);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["owner", "receptionist"], request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  const { id } = await params;
  const index = serverStore.patients.findIndex((p) => p.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: "Patient not found" },
      { status: 404 }
    );
  }

  const target = serverStore.patients[index];
  if (role !== "super_admin" && (target.clinic_id || "cln-1") !== clinicId) {
    return NextResponse.json(
      { error: "Patient not found" },
      { status: 404 }
    );
  }

  serverStore.patients.splice(index, 1);

  return NextResponse.json({
    status: "success",
    id,
    message: "Patient deleted successfully",
  });
}
