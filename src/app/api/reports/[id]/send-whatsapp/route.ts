import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { requireRole } from "@/lib/auth-guard";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["owner", "doctor", "receptionist"], request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  const { id } = await params;
  const report = serverStore.reports.find((r) => r.id === id);

  if (
    !report ||
    (role !== "super_admin" && (report.clinic_id || "cln-1") !== clinicId)
  ) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  report.sent_to_whatsapp = true;

  return NextResponse.json({
    status: "delivered",
    report_id: id,
    message: `Report ${report.title} dispatched to patient via WhatsApp document message.`,
  });
}
