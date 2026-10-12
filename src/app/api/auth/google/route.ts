import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";

export async function POST(request: Request) {
  try {
    const { email, name, avatar, role = "patient" } = (await request.json()) as {
      email: string;
      name?: string;
      avatar?: string;
      role?: "patient" | "doctor" | "receptionist";
    };

    if (!email) {
      return NextResponse.json({ error: "Google email is required" }, { status: 400 });
    }

    const userName = name || email.split("@")[0].replace(/[._]/g, " ");
    const isDoctor = role === "doctor" || email.includes("doctor") || email.includes("dr.");
    const isStaff = role === "receptionist" || email.includes("reception") || email.includes("admin");

    const finalRole: "doctor" | "receptionist" | "owner" = isDoctor
      ? "doctor"
      : isStaff
      ? "receptionist"
      : "receptionist";

    const user = {
      id: `usr-g-${Date.now()}`,
      name: isDoctor ? `Dr. ${userName}` : userName,
      email,
      role: finalRole,
      clinic_id: "cln-1",
      clinic_name: "SmileCraft Dental & Healthcare Hub",
      avatar_url: avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}`,
    };

    serverStore.currentUser = user;

    return NextResponse.json({
      success: true,
      user,
      token: `g-oauth-token-${Date.now()}`,
      expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
