import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth-session";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized: Active session required" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: session.user_id,
      name: session.name,
      email: session.email,
      role: session.role,
      clinic_id: session.clinic_id,
      clinic_name: session.clinic_name,
    });
  } catch (error) {
    console.error("Auth /me error:", error);
    return NextResponse.json(
      { error: "Failed to verify session" },
      { status: 500 }
    );
  }
}
