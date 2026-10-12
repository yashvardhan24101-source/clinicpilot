import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { QueueState } from "@/types/api";

export async function GET() {
  return NextResponse.json(serverStore.queueState);
}

export async function PATCH(request: Request) {
  const updates = (await request.json()) as Partial<QueueState>;
  serverStore.queueState = {
    ...serverStore.queueState,
    ...updates,
  };
  return NextResponse.json(serverStore.queueState);
}
