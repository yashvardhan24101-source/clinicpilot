import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as { email: string; password?: string };

  if (!email || !password) {
    return new NextResponse("Email and password are required", { status: 400 });
  }

  let role: "receptionist" | "doctor" | "owner" = "receptionist";
  let name = "Priya (Reception)";

  if (email.includes("doctor") || email.includes("sharma")) {
    role = "doctor";
    name = "Dr. Ananya Sharma";
  } else if (email.includes("owner") || email.includes("admin")) {
    role = "owner";
    name = "Dr. Vikram Patel (Owner)";
  }

  const user = {
    id: `usr-${Date.now()}`,
    name,
    email,
    role,
    clinic_id: "cln-1",
    clinic_name: "SmileCraft Dental Clinic",
  };

  serverStore.currentUser = user;

  return NextResponse.json(
    {
      user,
      token: `mock-jwt-token-${Date.now()}`,
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      headers: {
        "Set-Cookie": `clinicpilot_session=${user.id}; Path=/; HttpOnly; SameSite=Lax`,
      },
    }
  );
}
