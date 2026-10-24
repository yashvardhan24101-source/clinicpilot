import { NextResponse } from "next/server";
import { otpStore } from "@/lib/otp-store";
import {
  checkOtpAttemptLimit,
  recordOtpAttempt,
  resetOtpAttempts,
} from "@/lib/rate-limiter";

export async function POST(request: Request) {
  try {
    const isDemo = process.env.DEMO_MODE === "true";
    const hasRealProvider = !!(
      process.env.FAST2SMS_API_KEY ||
      process.env.TWO_FACTOR_API_KEY ||
      (process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER)
    );

    if (!isDemo && !hasRealProvider) {
      return NextResponse.json(
        {
          error:
            "OTP authentication is not available in production until a registered Indian DLT SMS or WhatsApp provider is configured.",
        },
        { status: 503 }
      );
    }

    const { phone, otp, name } = (await request.json()) as {
      phone?: string;
      otp?: string;
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

    // Enforce 3 attempts per code limit
    const attemptCheck = await checkOtpAttemptLimit(indianNumber);
    if (!attemptCheck.allowed) {
      if (attemptCheck.error) {
        return NextResponse.json(
          { error: attemptCheck.error },
          { status: 503 }
        );
      }
      otpStore.delete(indianNumber);
      return NextResponse.json(
        {
          error: "Too many failed attempts (maximum 3 attempts per code). Please request a new OTP.",
        },
        { status: 429 }
      );
    }

    // Master demo codes strictly permitted in DEMO_MODE only
    const isMasterCode =
      isDemo && (enteredOtp === "1234" || enteredOtp === "123456");

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

      if (entry.code !== enteredOtp) {
        entry.attempts += 1;
        await recordOtpAttempt(indianNumber);
        const remaining = Math.max(0, 3 - entry.attempts);

        if (remaining === 0) {
          otpStore.delete(indianNumber);
          return NextResponse.json(
            { error: "Too many failed attempts. Please request a new OTP." },
            { status: 429 }
          );
        }

        return NextResponse.json(
          {
            error: `Incorrect OTP. You have ${remaining} attempt(s) remaining.`,
          },
          { status: 400 }
        );
      }

      // Valid OTP: delete from store and reset attempt tracking
      otpStore.delete(indianNumber);
      await resetOtpAttempts(indianNumber);
    }

    const formattedPhone = `+91 ${indianNumber.slice(0, 5)} ${indianNumber.slice(5)}`;
    const patientName = name || "Patient User";

    const user = {
      id: `pat-${indianNumber}`,
      name: patientName,
      email: `${indianNumber}@patient.clinicpilot.in`,
      role: "receptionist" as const,
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
