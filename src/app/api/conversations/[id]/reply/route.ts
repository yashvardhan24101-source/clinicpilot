import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { ChatMessage } from "@/types/api";
import { requireRole } from "@/lib/auth-guard";

export async function POST(
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

  const { message } = (await request.json()) as { message?: string };
  if (!message?.trim()) {
    return NextResponse.json(
      { error: "Message content is required" },
      { status: 400 }
    );
  }

  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}`,
    conversation_id: id,
    sender: "staff",
    content: message.trim(),
    timestamp: new Date().toISOString(),
    delivery_status: "delivered",
  };

  conversation.messages.push(newMsg);
  conversation.last_message = message.trim();
  conversation.last_message_time = "Just now";
  conversation.state = "needs_staff";

  return NextResponse.json(newMsg, { status: 201 });
}
