import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { requireRole } from "@/lib/auth-guard";

export async function POST(request: Request) {
  const auth = await requireRole(["owner", "receptionist"], request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  const { ids } = (await request.json()) as { ids?: string[] };
  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json(
      { error: "List of follow-up IDs is required" },
      { status: 400 }
    );
  }

  // Clinic isolation: ONLY affect follow-ups belonging to the caller's clinic!
  let sentCount = 0;
  for (const f of serverStore.followups) {
    if (ids.includes(f.id)) {
      if (role === "super_admin" || (f.clinic_id || "cln-1") === clinicId) {
        f.status = "sent";
        sentCount += 1;
      }
    }
  }

  return NextResponse.json({
    sent_count: sentCount,
    message_category: "utility",
    cost_note: "Sent via WhatsApp Utility template (₹0.12/msg)",
  });
}
