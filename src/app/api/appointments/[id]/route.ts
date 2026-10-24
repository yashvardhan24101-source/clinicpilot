import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { Appointment } from "@/types/api";
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
  const appointment = serverStore.appointments.find((a) => a.id === id);

  // Clinic isolation: If appointment doesn't exist or belongs to another clinic, return 404
  if (
    !appointment ||
    (role !== "super_admin" && (appointment.clinic_id || "cln-1") !== clinicId)
  ) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  // Doctor isolation
  if (role === "doctor") {
    const doctorName = session?.name || request.headers.get("x-user-name") || "";
    const doctorUserId = session?.user_id || request.headers.get("x-user-id") || "";
    const isAssigned =
      appointment.doctor_id === doctorUserId ||
      (doctorName && appointment.doctor_name.toLowerCase().includes(doctorName.toLowerCase()));

    if (!isAssigned) {
      return NextResponse.json(
        { error: "Forbidden: You may only view your assigned appointments" },
        { status: 403 }
      );
    }
  }

  return NextResponse.json(appointment);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession(request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  const { id } = await params;
  const index = serverStore.appointments.findIndex((a) => a.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  const targetApt = serverStore.appointments[index];

  // Clinic isolation: prevent cross-clinic tampering
  if (
    role !== "super_admin" &&
    (targetApt.clinic_id || "cln-1") !== clinicId
  ) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  // Doctor check
  if (role === "doctor") {
    const doctorName = session.name || "";
    const doctorUserId = session.user_id || "";
    const isAssigned =
      targetApt.doctor_id === doctorUserId ||
      (doctorName && targetApt.doctor_name.toLowerCase().includes(doctorName.toLowerCase()));

    if (!isAssigned) {
      return NextResponse.json(
        { error: "Forbidden: You may only update your assigned appointments" },
        { status: 403 }
      );
    }
  }

  const updates = (await request.json()) as Partial<Appointment>;

  // Disallow tampering with clinic_id or id
  delete updates.id;
  delete updates.clinic_id;

  serverStore.appointments[index] = {
    ...targetApt,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json(serverStore.appointments[index]);
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
  const index = serverStore.appointments.findIndex((a) => a.id === id);

  if (index === -1) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  const targetApt = serverStore.appointments[index];

  if (
    role !== "super_admin" &&
    (targetApt.clinic_id || "cln-1") !== clinicId
  ) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  serverStore.appointments.splice(index, 1);

  return NextResponse.json({
    success: true,
    message: "Appointment deleted successfully",
    id,
  });
}
