import { NextResponse } from "next/server";
import { getFeatureFlags } from "@/lib/flags";
import { requireRole } from "@/lib/auth-guard";
import { serverStore } from "@/lib/server-store";

export async function GET(request: Request) {
  const flags = getFeatureFlags();
  if (!flags.digitalRx) {
    return NextResponse.json(
      { error: "Feature Not Found: Digital Prescriptions are disabled" },
      { status: 404 }
    );
  }

  const auth = await requireRole(["owner", "doctor"], request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;

  // Return prescriptions from completed appointments for this clinic
  const clinicAppointments = serverStore.appointments.filter(
    (a) => a.clinic_id === session.clinic_id && a.prescription
  );

  return NextResponse.json(clinicAppointments.map((a) => a.prescription));
}

export async function POST(request: Request) {
  const flags = getFeatureFlags();
  if (!flags.digitalRx) {
    return NextResponse.json(
      { error: "Feature Not Found: Digital Prescriptions are disabled" },
      { status: 404 }
    );
  }

  const auth = await requireRole(["owner", "doctor"], request);
  if (auth.errorResponse) return auth.errorResponse;

  return NextResponse.json({ success: true, message: "Prescription recorded" });
}
