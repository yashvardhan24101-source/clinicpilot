"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  LogIn,
  Sparkles,
  AlertCircle,
  User,
  Building2,
  Stethoscope,
  Phone,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  // Active Role Tab: "patient" or "staff"
  const [role, setRole] = useState<"patient" | "staff">("patient");

  // Staff Credentials State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  // Patient OTP State
  const [patientPhone, setPatientPhone] = useState("");
  const [patientOtp, setPatientOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);

  // Handle Staff (Hospital & Doctor) Login
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter your clinic email and password.");
      return;
    }

    try {
      await login({ email, password });
      if (email.includes("doctor")) {
        localStorage.setItem("clinicpilot_default_portal", "doctor");
        router.push("/doctor");
      } else {
        localStorage.setItem("clinicpilot_default_portal", "staff");
        router.push("/today");
      }
    } catch {
      setError("Invalid email or password. Please try again.");
    }
  };

  const handleForgotPassword = () => {
    setForgotSent(true);
    setTimeout(() => setForgotSent(false), 4000);
  };

  const handleDemoStaffLogin = async (staffRole: "receptionist" | "doctor" | "owner") => {
    setError(null);
    const demoEmails: Record<string, string> = {
      receptionist: "reception@smilecraft.in",
      doctor: "doctor@smilecraft.in",
      owner: "owner@smilecraft.in",
    };
    try {
      await login({ email: demoEmails[staffRole], password: "demo123" });
      if (staffRole === "doctor") {
        localStorage.setItem("clinicpilot_default_portal", "doctor");
        router.push("/doctor");
      } else {
        localStorage.setItem("clinicpilot_default_portal", "staff");
        router.push("/today");
      }
    } catch {
      setError("Demo login failed. Please try again.");
    }
  };

  // Handle Patient Request OTP
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = patientPhone.replace(/\D/g, "");
    if (clean.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setPatientLoading(true);
    setTimeout(() => {
      setPatientLoading(false);
      setOtpSent(true);
    }, 600);
  };

  // Handle Patient Verify OTP & Login
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!patientOtp || patientOtp.trim().length < 4) {
      setError("Please enter the 4-digit WhatsApp verification code.");
      return;
    }

    setPatientLoading(true);
    setTimeout(() => {
      try {
        const patientData = {
          name: "Aarav Mehta",
          phone: patientPhone.startsWith("+91") ? patientPhone : `+91 ${patientPhone}`,
          verified: true,
        };
        localStorage.setItem("clinicpilot_current_patient", JSON.stringify(patientData));
        localStorage.setItem("clinicpilot_default_portal", "patient");
        setPatientLoading(false);
        router.push("/");
      } catch (err) {
        console.error(err);
      }
    }, 500);
  };

  // One-Tap Demo Patient Login
  const handleDemoPatientLogin = () => {
    const patientData = {
      name: "Aarav Mehta",
      phone: "+91 98765 43210",
      verified: true,
    };
    localStorage.setItem("clinicpilot_current_patient", JSON.stringify(patientData));
    localStorage.setItem("clinicpilot_default_portal", "patient");
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-frost flex flex-col items-center justify-center p-4 select-none relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-signal/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-mint/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm space-y-6 relative z-10 animate-in fade-in duration-200">
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex flex-col items-center gap-1.5 group">
            <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-signal text-white shadow-md group-hover:scale-105 transition-transform">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-extrabold text-ink font-display tracking-tight">
              ClinicPilot
            </h1>
          </Link>
          <p className="text-xs text-ink-muted">
            Healthcare Operations &amp; Patient Appointment System
          </p>
        </div>

        {/* Role Selector Tabs: Patient vs Clinic Staff */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-surface-2 border border-line shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setRole("patient");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              role === "patient"
                ? "bg-surface-1 text-signal shadow-2xs border border-line font-display scale-[1.01]"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <User className="h-4 w-4" />
            <span>I am a Patient</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole("staff");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              role === "staff"
                ? "bg-surface-1 text-signal shadow-2xs border border-line font-display scale-[1.01]"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <Building2 className="h-4 w-4" />
            <span>Clinic Staff</span>
          </button>
        </div>

        {/* ================= PATIENT LOGIN ================= */}
        {role === "patient" && (
          <div className="space-y-4">
            <div className="bg-surface-1 rounded-3xl border border-line p-6 shadow-card space-y-4">
              <div className="text-center space-y-1 pb-1">
                <h2 className="text-base font-bold text-ink font-display">
                  Patient Portal Login
                </h2>
                <p className="text-xs text-ink-muted">
                  Log in to track appointments, live tokens, and digital passes
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-coral/10 border border-coral/20 text-xs text-coral font-medium">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!otpSent ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="patientPhone"
                      className="text-xs font-bold text-ink-muted font-display uppercase tracking-wider"
                    >
                      Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-ink-faint" />
                      <Input
                        id="patientPhone"
                        type="tel"
                        placeholder="98765 43210"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        required
                        className="pl-9"
                      />
                    </div>
                    <span className="text-[11px] text-ink-faint flex items-center gap-1 mt-1">
                      <MessageSquare className="h-3 w-3 text-mint" />
                      We will send a 4-digit code to your WhatsApp.
                    </span>
                  </div>

                  <Button
                    type="submit"
                    disabled={patientLoading}
                    className="w-full gap-2 shadow-sm font-semibold text-xs"
                    size="lg"
                  >
                    <span>{patientLoading ? "Sending OTP..." : "Send WhatsApp OTP"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="patientOtp"
                        className="text-xs font-bold text-ink-muted font-display uppercase tracking-wider"
                      >
                        Enter 4-Digit OTP
                      </label>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-[11px] text-signal hover:underline"
                      >
                        Change number
                      </button>
                    </div>

                    <Input
                      id="patientOtp"
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 1234"
                      value={patientOtp}
                      onChange={(e) => setPatientOtp(e.target.value)}
                      required
                      className="text-center font-display tracking-widest text-base font-bold"
                    />

                    <p className="text-[11px] text-mint font-medium flex items-center gap-1 justify-center pt-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Demo OTP hint: Use code <strong>1234</strong>
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={patientLoading}
                    className="w-full gap-2 shadow-sm font-semibold text-xs"
                    size="lg"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>{patientLoading ? "Verifying..." : "Verify & Sign In"}</span>
                  </Button>
                </form>
              )}

              {/* Quick One-Tap Demo Patient Login */}
              <div className="pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={handleDemoPatientLogin}
                  className="w-full py-2.5 px-3 rounded-xl border border-line bg-surface-2 hover:bg-surface-3 text-xs font-bold text-ink transition-colors flex items-center justify-center gap-2"
                >
                  <span>⚡ 1-Tap Demo Patient: Aarav Mehta</span>
                </button>
              </div>
            </div>

            {/* Link to browse freely */}
            <div className="text-center">
              <Link
                href="/"
                className="text-xs font-semibold text-signal hover:underline inline-flex items-center gap-1"
              >
                <span>Just searching for doctors? Browse without login</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* ================= STAFF & DOCTOR LOGIN ================= */}
        {role === "staff" && (
          <div className="space-y-4">
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div className="bg-surface-1 rounded-3xl border border-line p-6 shadow-card space-y-4">
                <div className="text-center space-y-1 pb-1">
                  <h2 className="text-base font-bold text-ink font-display">
                    Clinic Staff &amp; Doctor Login
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Sign in to your clinic front-desk operations dashboard or doctor chamber
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-coral/10 border border-coral/20 text-xs text-coral font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="text-xs font-bold text-ink-muted font-display uppercase tracking-wider"
                  >
                    Clinic Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="reception@smilecraft.in or doctor@smilecraft.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-xs font-bold text-ink-muted font-display uppercase tracking-wider"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[11px] text-signal hover:underline"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-ink-faint hover:text-ink transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full gap-2 shadow-sm font-semibold text-xs"
                  size="lg"
                >
                  <LogIn className="h-4 w-4" />
                  <span>{isLoading ? "Signing in..." : "Sign in to Dashboard"}</span>
                </Button>

                {/* 1-Tap Demo Staff Logins */}
                <div className="pt-2 border-t border-line space-y-1.5">
                  <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider font-display block">
                    Quick 1-Tap Demo Logins:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDemoStaffLogin("receptionist")}
                      className="p-2 rounded-xl border border-line bg-surface-2 hover:bg-surface-3 text-[11px] font-bold text-ink text-center transition-colors"
                    >
                      <span>Reception</span>
                      <span className="block text-[9px] text-ink-muted font-normal">
                        Priya
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoStaffLogin("doctor")}
                      className="p-2 rounded-xl border border-line bg-surface-2 hover:bg-surface-3 text-[11px] font-bold text-signal text-center transition-colors"
                    >
                      <span>Doctor</span>
                      <span className="block text-[9px] text-ink-muted font-normal">
                        Dr. Ananya
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDemoStaffLogin("owner")}
                      className="p-2 rounded-xl border border-line bg-surface-2 hover:bg-surface-3 text-[11px] font-bold text-ink text-center transition-colors"
                    >
                      <span>Owner</span>
                      <span className="block text-[9px] text-ink-muted font-normal">
                        Dr. Vikram
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Security badge footer */}
        <div className="text-center text-[11px] text-ink-faint flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-mint" />
          <span>256-bit Encrypted Healthcare Session</span>
        </div>
      </div>
    </div>
  );
}
