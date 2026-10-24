import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { QueueState } from "@/types/api";
import { requireSession, requireRole } from "@/lib/auth-guard";

export async function GET(request: Request) {
  const auth = await requireSession(request);
  if (auth.errorResponse) return auth.errorResponse;

  return NextResponse.json(serverStore.queueState);
}

export async function PATCH(request: Request) {
  const auth = await requireRole(["owner", "receptionist", "doctor"], request);
  if (auth.errorResponse) return auth.errorResponse;

  const updates = (await request.json()) as Partial<QueueState>;
  serverStore.queueState = {
    ...serverStore.queueState,
    ...updates,
  };
  return NextResponse.json(serverStore.queueState);
}
