import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __clinicpilot_otp_store__: Map<string, OtpEntry> | undefined;
}

const otpStore: Map<string, OtpEntry> =
  global.__clinicpilot_otp_store__ || new Map<string, OtpEntry>();

export async function POST(request: Request) {
  try {
    const { phone, otp, name } = (await request.json()) as {
      phone: string;
      otp: string;
      name?: string;
    };

    if (!phone || !otp) {
      return NextResponse.json(
        { error: "Phone number and OTP code are required" },
        { status: 400 }
      );
    }

    const cleanDigits = phone.replace(/\D/g, "");
    const indianNumber = cleanDigits.slice(-10);
    const enteredOtp = otp.trim();

    // Check master demo code fallback
    const isMasterCode = enteredOtp === "1234" || enteredOtp === "123456";

    const entry = otpStore.get(indianNumber);

    if (!isMasterCode) {
      if (!entry) {
        return NextResponse.json(
          { error: "OTP expired or not requested. Please request a new code." },
          { status: 400 }
        );
      }

      if (Date.now() > entry.expiresAt) {
        otpStore.delete(indianNumber);
        return NextResponse.json(
          { error: "OTP has expired. Please request a new code." },
          { status: 400 }
        );
      }

      if (entry.attempts >= 4) {
        otpStore.delete(indianNumber);
        return NextResponse.json(
          { error: "Too many failed attempts. Please request a new OTP." },
          { status: 429 }
        );
      }

      if (entry.code !== enteredOtp) {
        entry.attempts += 1;
        return NextResponse.json(
          {
            error: `Incorrect OTP. You have ${4 - entry.attempts} attempts remaining.`,
          },
          { status: 400 }
        );
      }

      // Valid OTP: delete from store
      otpStore.delete(indianNumber);
    }

    // Successfully verified! Create or match patient user session
    const formattedPhone = `+91 ${indianNumber.slice(0, 5)} ${indianNumber.slice(5)}`;
    const patientName = name || "Aarav Mehta";

    const user = {
      id: `pat-${indianNumber}`,
      name: patientName,
      email: `${indianNumber}@patient.clinicpilot.in`,
      role: "receptionist" as const, // Default UI role or patient
      clinic_id: "cln-1",
      clinic_name: "SmileCraft Dental & Healthcare Hub",
    };

    const patientProfile = {
      id: `pat-${indianNumber}`,
      name: patientName,
      phone: formattedPhone,
      verified: true,
      last_login: new Date().toISOString(),
    };

    serverStore.currentUser = user;

    return NextResponse.json({
      success: true,
      user,
      patient: patientProfile,
      token: `jwt-otp-${Date.now()}`,
      message: "Mobile number successfully authenticated",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
