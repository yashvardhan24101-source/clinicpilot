"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  LogIn,
  Sparkles,
  AlertCircle,
  Building2,
  Stethoscope,
  Phone,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { GoogleAccountModal, GoogleLogo } from "@/components/auth/google-account-modal";
import { FeatureFlags } from "@/lib/flags";

function getSafeRedirectUrl(searchParamsString: string, fallbackRole?: string): string {
  if (typeof window === "undefined") return "/today";
  const params = new URLSearchParams(searchParamsString);
  const next = params.get("next");
  if (next && next.startsWith("/") && !next.startsWith("//") && !next.includes("://")) {
    return next;
  }
  return fallbackRole === "doctor" ? "/doctor" : "/today";
}

export interface LoginClientProps {
  flags: FeatureFlags;
}

export function LoginClient({ flags }: LoginClientProps) {
  const router = useRouter();
  const { login, loginWithGoogle, loginWithOtp, isLoading } = useAuth();

  // Active Role Tab: "staff" (default for clinic operations) or "patient"
  const [role, setRole] = useState<"patient" | "staff">("staff");

  // Demo UI is strictly controlled ONLY by NEXT_PUBLIC_DEMO_MODE (no query override)
  const showDemoShortcuts = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  // Google Sign-In Modal State
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  // Staff Credentials State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  // Indian Mobile OTP State
  const [patientPhone, setPatientPhone] = useState("");
  const [patientOtp, setPatientOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Live Incoming SMS Banner Simulation
  const [incomingSms, setIncomingSms] = useState<{
    phone: string;
    code: string;
    timestamp: string;
  } | null>(null);

  // Resend Countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  // Handle Google Sign-In Selection (gated behind demo mode)
  const handleGoogleSelect = async (account: {
    email: string;
    name: string;
    avatar: string;
    role: "patient" | "doctor" | "receptionist";
  }) => {
    setIsGoogleModalOpen(false);
    setError(null);
    try {
      const user = await loginWithGoogle(account);
      const destination = getSafeRedirectUrl(window.location.search, user.role);
      router.push(destination);
    } catch {
      setError("Google authentication failed. Please try again.");
    }
  };

  // Handle Staff (Hospital & Doctor) Login
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter your clinic email and password.");
      return;
    }

    try {
      const user = await login({ email, password });
      const destination = getSafeRedirectUrl(window.location.search, user.role);
      router.push(destination);
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
      const user = await login({ email: demoEmails[staffRole], password: "demo123" });
      const destination = getSafeRedirectUrl(window.location.search, user.role);
      router.push(destination);
    } catch {
      setError("Demo login failed. Please try again.");
    }
  };

  // Handle Real-Time OTP Send to Indian Mobile Number
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = patientPhone.replace(/\D/g, "");
    const last10 = clean.slice(-10);

    if (last10.length !== 10 || !/^[6-9]\d{9}$/.test(last10)) {
      setError("Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, or 9).");
      return;
    }

    setPatientLoading(true);
    try {
      const res = await api.sendOtp(patientPhone);
      setOtpSent(true);
      setResendTimer(30);

      // Trigger realistic live SMS incoming alert
      if (res.delivered_otp) {
        setIncomingSms({
          phone: res.phone,
          code: res.delivered_otp,
          timestamp: "Just Now",
        });
      }
    } catch (err: unknown) {
      console.warn("OTP API error:", err);
      setError("Unable to send OTP. Please check the mobile number or try again later.");
    } finally {
      setPatientLoading(false);
    }
  };

  // Handle Patient OTP Verification & Login
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (patientOtp.length !== 6) {
      setError("Please enter the 6-digit OTP received on your mobile.");
      return;
    }

    setPatientLoading(true);
    try {
      const user = await loginWithOtp(patientPhone, patientOtp);
      const destination = getSafeRedirectUrl(window.location.search, user.role);
      router.push(destination);
    } catch (err: unknown) {
      console.warn("OTP verification error:", err);
      setError("Invalid OTP code. Please enter the correct code or tap Resend.");
    } finally {
      setPatientLoading(false);
    }
  };

  // Demo 1-tap Patient Login
  const handleDemoPatientLogin = async () => {
    setError(null);
    try {
      const user = await loginWithOtp("9876543210", "123456", "Aarav Mehta");
      const destination = getSafeRedirectUrl(window.location.search, user.role);
      router.push(destination);
    } catch {
      setError("Demo patient login failed.");
    }
  };

  const handleAutofillSms = () => {
    if (incomingSms?.code) {
      setPatientOtp(incomingSms.code);
      setIncomingSms(null);
    }
  };

  return (
    <div className="min-h-screen bg-frost flex flex-col items-center justify-center p-4 select-none relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-signal/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-mint/10 blur-3xl pointer-events-none" />

      {/* Real-time Incoming SMS Push Notification Banner */}
      {incomingSms && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-3 animate-in slide-in-from-top-4 duration-300">
          <div className="p-3.5 rounded-2xl bg-surface-1 border-2 border-mint/40 shadow-2xl flex items-start justify-between gap-3 backdrop-blur-md">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-mint text-white shrink-0 shadow-xs">
                <Smartphone className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-ink uppercase tracking-wider font-display">
                    GOV-CLNPIL • SMS
                  </span>
                  <span className="text-xs text-mint font-bold">• {incomingSms.timestamp}</span>
                </div>
                <p className="text-xs text-ink font-medium mt-0.5 leading-snug">
                  Your ClinicPilot security OTP code is{" "}
                  <strong className="text-signal font-mono text-sm tracking-wider">
                    {incomingSms.code}
                  </strong>
                  . Valid for 5 mins.
                </p>
              </div>
            </div>

            <button
              onClick={handleAutofillSms}
              className="px-2.5 py-1.5 rounded-xl bg-signal text-white text-xs font-bold shrink-0 shadow-xs hover:bg-signal-hover transition-colors"
            >
              Autofill
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-sm space-y-5 relative z-10 animate-in fade-in duration-200">
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
            Healthcare Operations &amp; Front-Desk System
          </p>
        </div>

        {/* Simulated Google Sign-In (Only visible in Demo Mode) */}
        {showDemoShortcuts && (
          <>
            <div className="bg-surface-1 rounded-2xl border border-line p-3 shadow-card space-y-2">
              <button
                type="button"
                onClick={() => setIsGoogleModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl border border-line bg-surface-1 hover:bg-surface-2 text-ink text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-2.5 group cursor-pointer"
              >
                <GoogleLogo className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                <span>Continue with Google (Demo)</span>
              </button>
              <p className="text-xs text-ink-faint text-center">
                Demo sign-in with registered staff account
              </p>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-line" />
              </div>
              <span className="relative bg-frost px-3 text-xs font-bold uppercase tracking-wider text-ink-muted">
                Or via Clinic Credentials
              </span>
            </div>
          </>
        )}

        {/* Role Selector Tabs (Only rendered when patientPortal flag is enabled) */}
        {flags.patientPortal && (
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
              <Phone className="h-3.5 w-3.5" />
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
              <Building2 className="h-3.5 w-3.5" />
              <span>Clinic Staff</span>
            </button>
          </div>
        )}

        {/* Error Alert Box */}
        {error && (
          <div
            id="login-error-alert"
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-2.5 p-3 rounded-2xl bg-alert-subtle border border-alert/30 text-alert-foreground text-xs animate-in shake duration-200"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-snug font-medium">{error}</span>
          </div>
        )}

        {/* Forgot Password Success Notice */}
        {forgotSent && (
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-mint/15 border border-mint/40 text-ink text-xs animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-mint shrink-0 mt-0.5" />
            <span className="leading-snug font-medium">
              Password reset link has been dispatched to clinic admin. Check inbox.
            </span>
          </div>
        )}

        {/* TAB 1: PATIENT OTP LOGIN (Only when role === "patient" and patientPortal enabled) */}
        {flags.patientPortal && role === "patient" && (
          <div className="bg-surface-1 rounded-3xl border border-line p-6 shadow-card space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-ink font-display flex items-center gap-2">
                <span>Patient Portal Login</span>
                <span className="text-xs font-bold text-mint bg-mint/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Mobile OTP
                </span>
              </h2>
              <p className="text-xs text-ink-muted">
                Enter your 10-digit Indian phone number to access appointments, prescriptions, and live token status.
              </p>
            </div>

            {!otpSent ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="patient-phone"
                    className="block text-xs font-bold uppercase tracking-wider text-ink font-display"
                  >
                    Indian Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-bold text-ink-muted select-none border-r border-line pr-2.5">
                      +91
                    </span>
                    <Input
                      id="patient-phone"
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="98765 43210"
                      maxLength={14}
                      className="pl-16 font-mono text-sm tracking-wide"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-ink-faint">
                    Carrier SMS in India requires TRAI DLT registration. In demo / test mode, OTP is verified instantly.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={patientLoading}
                  className="w-full gap-2 text-xs font-bold py-5 shadow-sm"
                >
                  {patientLoading ? (
                    <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Get Login OTP</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Quick One-Tap Demo Patient Login (Hidden behind demo flag) */}
                {showDemoShortcuts && (
                  <div className="pt-2 border-t border-line">
                    <button
                      type="button"
                      onClick={handleDemoPatientLogin}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-signal/40 bg-signal/5 hover:bg-signal/10 text-signal text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>1-Tap Demo Patient (Aarav Mehta)</span>
                    </button>
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="patient-otp"
                      className="block text-xs font-bold uppercase tracking-wider text-ink font-display"
                    >
                      Enter 6-Digit OTP
                    </label>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-xs font-semibold text-signal hover:underline"
                    >
                      Change Number
                    </button>
                  </div>

                  <Input
                    id="patient-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={patientOtp}
                    onChange={(e) => setPatientOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="text-center font-mono text-lg tracking-widest font-bold h-12"
                    autoFocus
                  />
                  <div className="flex items-center justify-between text-xs text-ink-muted">
                    <span>Sent to +91 {patientPhone.replace(/\D/g, "").slice(-10)}</span>
                    {resendTimer > 0 ? (
                      <span className="text-ink-faint">Resend in {resendTimer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleRequestOtp}
                        className="text-signal font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Resend OTP</span>
                      </button>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={patientLoading || patientOtp.length !== 6}
                  className="w-full gap-2 text-xs font-bold py-5 shadow-sm"
                >
                  {patientLoading ? (
                    <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      <span>Verify &amp; Continue</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        )}

        {/* TAB 2: CLINIC STAFF LOGIN */}
        {role === "staff" && (
          <div className="bg-surface-1 rounded-3xl border border-line p-6 shadow-card space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-ink font-display flex items-center gap-2">
                <span>Clinic Staff &amp; Doctor Login</span>
                <span className="text-xs font-bold text-signal bg-signal-subtle px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Staff Panel
                </span>
              </h2>
              <p className="text-xs text-ink-muted">
                Receptionists, doctors, and clinic managers sign in with your clinic credentials.
              </p>
            </div>

            <form onSubmit={handleStaffSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label
                  htmlFor="staff-email"
                  className="block text-xs font-bold uppercase tracking-wider text-ink font-display"
                >
                  Clinic Email
                </label>
                <Input
                  id="staff-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="reception@smilecraft.in"
                  autoComplete="email"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "login-error-alert" : undefined}
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="staff-password"
                    className="block text-xs font-bold uppercase tracking-wider text-ink font-display"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-semibold text-signal hover:underline py-1 px-1.5 rounded focus-visible:ring-2 focus-visible:ring-signal"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="staff-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "login-error-alert" : undefined}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center text-ink-faint hover:text-ink transition-colors rounded-lg focus-visible:ring-2 focus-visible:ring-signal"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-1 space-y-2">
                <Button
                  type="submit"
                  disabled={isLoading}
                  aria-label={isLoading ? "Signing in..." : "Sign in to Dashboard"}
                  className="w-full gap-2 text-xs font-bold min-h-[44px] py-4 shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      <span>Sign in to Dashboard</span>
                    </>
                  )}
                </Button>

                {/* 1-Tap Demo Staff Logins (Only visible when demo flag is on) */}
                {showDemoShortcuts && (
                  <div className="pt-2 border-t border-line space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-faint block text-center">
                      Quick Demo Logins (Demo Mode)
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDemoStaffLogin("receptionist")}
                        className="p-2 rounded-xl border border-line bg-surface-2 hover:bg-surface-3 text-xs font-bold text-signal text-center transition-colors"
                      >
                        <span>Reception</span>
                        <span className="block text-xs text-ink-muted font-normal">
                          Priya
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDemoStaffLogin("doctor")}
                        className="p-2 rounded-xl border border-line bg-surface-2 hover:bg-surface-3 text-xs font-bold text-signal text-center transition-colors"
                      >
                        <span>Doctor</span>
                        <span className="block text-xs text-ink-muted font-normal">
                          Dr. Ananya
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDemoStaffLogin("owner")}
                        className="p-2 rounded-xl border border-line bg-surface-2 hover:bg-surface-3 text-xs font-bold text-ink text-center transition-colors"
                      >
                        <span>Owner</span>
                        <span className="block text-xs text-ink-muted font-normal">
                          Dr. Vikram
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Secondary link to Patient Portal (Only when flag is enabled) */}
        {flags.patientPortal && (
          <div className="text-center pt-1 border-t border-line/60">
            <Link
              href="/patient"
              className="text-xs text-ink-muted hover:text-signal transition-colors inline-flex items-center gap-1 font-medium"
            >
              <span>Looking for patient appointment booking? Open Patient Portal</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* Mandatory Medical Disclaimer Footer and Legal Links */}
        <footer className="w-full pt-4 border-t border-line text-center text-xs text-ink-soft space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-left text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-signal shrink-0" />
            <span>ClinicPilot helps clinics with scheduling and reminders. It does not provide medical advice.</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-xs">
            <Link href="/privacy" className="hover:text-signal transition-colors py-2 px-1 inline-block">Privacy Policy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-signal transition-colors py-2 px-1 inline-block">Terms of Service</Link>
            <span>•</span>
            <span className="text-ok-foreground font-medium">Secure connection</span>
          </div>
        </footer>
      </div>

      {/* Google Account Picker Modal */}
      <GoogleAccountModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSelectAccount={handleGoogleSelect}
      />
    </div>
  );
}
