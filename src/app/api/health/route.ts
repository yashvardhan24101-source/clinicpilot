import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "clinicpilot",
    timestamp: new Date().toISOString(),
  });
}
