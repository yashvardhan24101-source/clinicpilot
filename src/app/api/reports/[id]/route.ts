import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { requireRole, requireSession } from "@/lib/auth-guard";

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
  const report = serverStore.reports.find((r) => r.id === id);

  if (
    !report ||
    (role !== "super_admin" && (report.clinic_id || "cln-1") !== clinicId)
  ) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json(report);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["owner"], request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  const { id } = await params;
  const index = serverStore.reports.findIndex((r) => r.id === id);

  if (index === -1) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const target = serverStore.reports[index];
  if (role !== "super_admin" && (target.clinic_id || "cln-1") !== clinicId) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  serverStore.reports.splice(index, 1);

  return NextResponse.json({
    status: "success",
    id,
    message: "Report deleted successfully",
  });
}
