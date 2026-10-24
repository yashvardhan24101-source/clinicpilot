import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { FollowUp } from "@/types/api";
import { requireRole } from "@/lib/auth-guard";

export async function POST(request: Request) {
  const auth = await requireRole(["owner", "receptionist"], request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  const { ids, days = 7 } = (await request.json()) as {
    ids?: string[];
    days?: number;
  };

  if (!ids || !Array.isArray(ids)) {
    return NextResponse.json(
      { error: "List of follow-up IDs is required" },
      { status: 400 }
    );
  }

  const updated: FollowUp[] = [];

  for (const f of serverStore.followups) {
    if (ids.includes(f.id)) {
      if (role === "super_admin" || (f.clinic_id || "cln-1") === clinicId) {
        f.status = "snoozed";
        const dueDate = new Date(Date.now() + days * 86400000);
        f.due_date = dueDate.toISOString().split("T")[0];
        updated.push(f);
      }
    }
  }

  return NextResponse.json({
    snoozed_count: updated.length,
    updated,
  });
}
