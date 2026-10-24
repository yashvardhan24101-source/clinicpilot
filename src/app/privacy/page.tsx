import React from "react";
import Link from "next/link";
import { Sparkles, ArrowLeft, ShieldCheck } from "lucide-react";

export default function PrivacyPage() {
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
              Legal &amp; Privacy
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
              Draft — pending legal review
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink font-display tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-ink-soft">
            Status: Draft for developer preview • October 2026
          </p>
        </div>

        <div className="bg-surface-1 rounded-2xl border border-line p-6 shadow-subtle space-y-6 text-sm text-ink-soft leading-relaxed">
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
            <strong>Notice:</strong> This document is a preliminary draft pending formal legal review. It outlines current privacy and operational practices for the developer prototype build.
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink font-display">
              1. Information We Collect
            </h2>
            <p>
              ClinicPilot collects clinic administrative details (staff names, business emails, and roles) and appointment records (patient names, masked contact numbers, appointment time slots) solely to operate front-desk schedules and WhatsApp notifications.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink font-display">
              2. How We Use Patient Data
            </h2>
            <p>
              Patient phone numbers are used exclusively to deliver appointment booking confirmations, reminder alerts, token queue updates, and requested lab reports. We do not sell, rent, or monetize patient contact information or health records.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink font-display">
              3. Tenant Isolation &amp; Encryption in Transit
            </h2>
            <p>
              Clinic records are strictly partitioned by clinic ID in runtime application memory, with cross-clinic access blocked at the API layer. All network communications are secured using standard TLS/HTTPS in transit. Persistent encrypted database storage will be integrated prior to production deployment.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink font-display">
              4. Medical Disclaimer
            </h2>
            <div className="p-3.5 rounded-xl bg-signal-subtle/50 border border-signal/20 text-ink text-xs font-medium">
              ClinicPilot helps clinics with scheduling and reminders. It does not provide medical advice.
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-bold text-ink font-display">
              5. Offline Schedule Caching &amp; Data Minimization
            </h2>
            <p>
              To support uninterrupted clinic front-desk operations during network outages, ClinicPilot caches a minimal, de-identified snapshot of today&apos;s schedule in local device storage (IndexedDB).
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li><strong>Minimal Fields Only:</strong> Cached records contain only appointment time, doctor, service, status, and de-identified patient initials (e.g., &quot;Rahul S.&quot;). Phone numbers, clinical notes, and medical records are strictly excluded from offline storage.</li>
              <li><strong>Time-to-Live (TTL):</strong> Cached snapshots automatically expire after at most 8 hours (or upon session expiration, whichever is earlier) and are never displayed once expired.</li>
              <li><strong>Automatic Purging:</strong> Stored snapshots for previous dates are permanently deleted upon every new write, and all cached data is immediately wiped from local storage upon user logout or session termination.</li>
            </ul>
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
            <Link href="/privacy" className="text-signal font-semibold">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-signal">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
