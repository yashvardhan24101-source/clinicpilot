import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { serverStore } from "@/lib/server-store";

export async function GET(request: Request) {
  const auth = await requireRole(["super_admin"], request);
  if (auth.errorResponse) return auth.errorResponse;

  return NextResponse.json({
    total_clinics: 2,
    total_appointments: serverStore.appointments.length,
    total_patients: serverStore.patients.length,
    total_conversations: serverStore.conversations.length,
    system_status: "operational",
  });
}
