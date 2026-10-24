import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { requireRole } from "@/lib/auth-guard";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(["owner", "receptionist"], request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;
  const role = session.role;

  const { id } = await params;
  const conversation = serverStore.conversations.find((c) => c.id === id);

  if (
    !conversation ||
    (role !== "super_admin" && (conversation.clinic_id || "cln-1") !== clinicId)
  ) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(conversation.messages || []);
}
