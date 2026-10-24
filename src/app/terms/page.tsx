import React from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft, ShieldCheck } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col justify-between select-none">
      <header className="border-b border-line bg-surface-1/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-signal flex items-center justify-center text-white shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-display font-bold text-ink text-base tracking-tight">
              ClinicPilot
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-signal hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 sm:py-12 space-y-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-signal uppercase tracking-wider font-display">
              Legal &amp; Compliance
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
              Draft — pending legal review
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-display tracking-tight">
            Terms of Service
          </h1>
          <p className="text-xs text-ink-soft">
            Status: Draft for developer preview • October 2026
          </p>
        </div>

        <div className="bg-surface-1 rounded-2xl border border-line p-6 shadow-subtle space-y-6 text-sm text-ink-soft leading-relaxed">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
            <strong>Notice:</strong> This document is a preliminary draft pending formal legal review. It describes the prototype operational model of ClinicPilot.
          </div>
          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink font-display">
              1. Nature of Service &amp; Medical Disclaimer
            </h2>
            <p>
              ClinicPilot is an administrative assistant and practice management platform designed for clinic reception desks, appointments, automated reminders, and lab report delivery.
            </p>
            <div className="p-3.5 rounded-xl bg-signal-subtle/50 border border-signal/20 text-ink text-xs font-medium">
              <strong>Medical Disclaimer:</strong> ClinicPilot helps clinics with scheduling and reminders. It does not provide medical advice, diagnosis, or clinical treatment plans. All clinical care is solely between licensed medical professionals and their patients.
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink font-display">
              2. Clinic Accounts &amp; Authorized Access
            </h2>
            <p>
              Clinic administrators and staff must maintain the confidentiality of their access credentials. Access is restricted to authorized clinic staff according to assigned roles (Owner, Receptionist, Doctor).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink font-display">
              3. Telecommunications &amp; WhatsApp Messaging
            </h2>
            <p>
              WhatsApp and SMS communications sent through ClinicPilot comply with TRAI DLT guidelines in India and Meta Cloud API business messaging standards. Automated reminders are sent solely on behalf of the registered clinic for scheduled appointments.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink font-display">
              4. Current Prototype Storage &amp; Transit Security
            </h2>
            <p>
              In the current prototype, clinic tenant data is isolated in application memory during runtime, with all network communications secured via standard TLS/HTTPS in transit. Persistent database storage and archival policies will be established prior to general commercial availability.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-line py-6 text-center text-xs text-ink-soft">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-signal" />
            <span>ClinicPilot helps clinics with scheduling and reminders. It does not provide medical advice.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-signal">Privacy Policy</Link>
            <Link href="/terms" className="text-signal font-semibold">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
