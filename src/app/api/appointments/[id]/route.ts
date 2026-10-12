import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { Appointment } from "@/types/api";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const updates = (await request.json()) as Partial<Appointment>;

  const index = serverStore.appointments.findIndex((a) => a.id === id);
  if (index === -1) {
    return new NextResponse("Appointment not found", { status: 404 });
  }

  serverStore.appointments[index] = {
    ...serverStore.appointments[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json(serverStore.appointments[index]);
}
