import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";

export async function GET() {
  if (!serverStore.currentUser) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  return NextResponse.json(serverStore.currentUser);
}
