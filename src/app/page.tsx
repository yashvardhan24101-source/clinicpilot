import React from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth-session";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Clock,
  Send,
} from "lucide-react";

export default async function RootHomePage() {
  // 1. If user is logged in with a valid session, redirect immediately to /today
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionCookie) {
    const session = await verifySessionToken(sessionCookie);
    if (session) {
      redirect("/today");
    }
  }

  // 2. If logged out, render short staff landing page (no role-selection screen)
  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-line bg-surface-1/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-signal flex items-center justify-center text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <span className="font-display font-bold text-ink text-base tracking-tight">
                ClinicPilot
              </span>
              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-signal bg-signal-subtle px-1.5 py-0.5 rounded">
                Staff
              </span>
            </div>
          </div>

          <Link href="/login">
            <Button size="sm" className="gap-1.5 shadow-sm font-medium">
              <span>Sign in</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 max-w-3xl mx-auto px-4 py-12 sm:py-20 flex flex-col items-center text-center justify-center space-y-8">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-signal-subtle text-signal text-xs font-semibold font-display border border-signal/20">
          <Clock className="h-3.5 w-3.5" />
          <span>Front-Desk Operations &amp; WhatsApp Assistant</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-ink font-display tracking-tight leading-tight">
            Clinic front desk on autopilot.
          </h1>
          <p className="text-base sm:text-lg text-ink-soft max-w-xl mx-auto">
            Real-time appointment schedule, automated WhatsApp reminders, two-way patient inbox, and 1-tap report delivery.
          </p>
        </div>

        {/* Primary Call to Action */}
        <div className="w-full max-w-xs space-y-3">
          <Link href="/login" className="w-full block">
            <Button size="lg" className="w-full gap-2 text-sm font-semibold shadow-md py-6">
              <span>Sign in to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          {/* Secondary Patient Guidance (Explicit requirement for Issue 10) */}
          <p className="text-xs text-ink-soft font-normal">
            Patient? Book through your clinic&apos;s WhatsApp.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-8 text-left">
          <div className="bg-surface-1 rounded-xl p-4 border border-line shadow-subtle space-y-1.5">
            <div className="h-8 w-8 rounded-lg bg-signal-subtle text-signal flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-ink font-display">Live Schedule</h3>
            <p className="text-xs text-ink-soft">
              Real-time time rail with token tracking and open slot booking.
            </p>
          </div>

          <div className="bg-surface-1 rounded-xl p-4 border border-line shadow-subtle space-y-1.5">
            <div className="h-8 w-8 rounded-lg bg-ok-subtle text-ok flex items-center justify-center">
              <MessageSquare className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-ink font-display">WhatsApp Inbox</h3>
            <p className="text-xs text-ink-soft">
              Two-way messaging with AI assistance and seamless staff takeover.
            </p>
          </div>

          <div className="bg-surface-1 rounded-xl p-4 border border-line shadow-subtle space-y-1.5">
            <div className="h-8 w-8 rounded-lg bg-warn-subtle text-warn flex items-center justify-center">
              <Send className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-ink font-display">1-Tap Reports</h3>
            <p className="text-xs text-ink-soft">
              Deliver lab reports and post-visit recall notices directly to WhatsApp.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-line py-6 text-center text-xs text-ink-soft bg-surface-1/40">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-left">
            <ShieldCheck className="h-3.5 w-3.5 text-signal shrink-0" />
            <span>ClinicPilot helps clinics with scheduling and reminders. It does not provide medical advice.</span>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <Link href="/privacy" className="hover:text-signal transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-signal transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
