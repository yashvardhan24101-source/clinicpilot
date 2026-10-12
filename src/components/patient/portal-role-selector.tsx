"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Stethoscope,
  Building2,
  CalendarCheck,
  Clock,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  Check,
  User,
  HeartPulse,
} from "lucide-react";

interface PortalRoleSelectorProps {
  onSelectPatient: () => void;
  onSelectStaff: () => void;
  onSelectDoctor?: () => void;
}

export const PortalRoleSelector: React.FC<PortalRoleSelectorProps> = ({
  onSelectPatient,
  onSelectStaff,
  onSelectDoctor,
}) => {
  const [rememberChoice, setRememberChoice] = useState(false);

  const handlePatientClick = () => {
    if (rememberChoice) {
      localStorage.setItem("clinicpilot_default_portal", "patient");
    }
    onSelectPatient();
  };

  const handleStaffClick = () => {
    if (rememberChoice) {
      localStorage.setItem("clinicpilot_default_portal", "staff");
    }
    onSelectStaff();
  };

  const handleDoctorClick = () => {
    if (rememberChoice) {
      localStorage.setItem("clinicpilot_default_portal", "doctor");
    }
    if (onSelectDoctor) {
      onSelectDoctor();
    } else {
      onSelectStaff();
    }
  };

  return (
    <div className="min-h-screen bg-frost flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-signal/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-mint/10 blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full mx-auto relative z-10 space-y-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand & Welcome Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-1 border border-line shadow-2xs text-xs font-semibold text-ink">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-signal text-white">
              <Sparkles className="h-3 w-3" />
            </div>
            <span>ClinicPilot Healthcare System</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-ink font-display tracking-tight">
            Welcome to ClinicPilot
          </h1>

          <p className="text-xs sm:text-sm text-ink-muted max-w-md mx-auto leading-relaxed">
            Please choose how you would like to access the portal today. Tailored for Patients, Doctors, and Reception Staff.
          </p>
        </div>

        {/* 2 Big Interactive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* Card 1: Patient Portal */}
          <div
            onClick={handlePatientClick}
            className="group relative rounded-3xl border border-line bg-surface-1 p-6 sm:p-8 shadow-card hover:shadow-xl hover:border-signal/50 transition-all cursor-pointer flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-signal opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-signal/10 text-signal group-hover:bg-signal group-hover:text-white transition-all shadow-sm">
                  <HeartPulse className="h-7 w-7" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-signal/10 text-signal text-[11px] font-bold font-display uppercase tracking-wider">
                  Public
                </span>
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-ink font-display group-hover:text-signal transition-colors">
                  I am a Patient
                </h2>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  Schedule appointments with clinic doctors, select visit modes, and track your waiting queue in real time.
                </p>
              </div>

              <div className="pt-2 space-y-2 border-t border-line text-xs text-ink-muted font-medium">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-mint shrink-0" />
                  <span>Search clinic doctors by specialty</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-mint shrink-0" />
                  <span>Live Queue Badge &amp; Token Number</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-mint shrink-0" />
                  <span>Instant WhatsApp confirmation &amp; pass</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-line">
              <button
                type="button"
                className="w-full py-3 px-4 rounded-xl bg-signal text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm group-hover:bg-signal-hover transition-colors"
              >
                <span>Enter Patient Portal</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Card 2: Staff & Clinic Panel (Doctors + Receptionists) */}
          <div
            className="group relative rounded-3xl border border-line bg-surface-1 p-6 sm:p-8 shadow-card hover:shadow-xl hover:border-mint/50 transition-all flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-mint opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/10 text-mint group-hover:bg-mint group-hover:text-white transition-all shadow-sm">
                  <Building2 className="h-7 w-7" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-mint/10 text-mint text-[11px] font-bold font-display uppercase tracking-wider">
                  Clinic &amp; Doctors
                </span>
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-ink font-display group-hover:text-mint transition-colors">
                  I am Clinic Staff / Doctor
                </h2>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                  Front-desk operations, doctor chamber calling station, schedule time rail, and WhatsApp takeover.
                </p>
              </div>

              <div className="pt-2 space-y-2 border-t border-line text-xs text-ink-muted font-medium">
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-mint shrink-0" />
                  <span>Live Vertical Time Rail &amp; Walk-ins</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-mint shrink-0" />
                  <span>Doctor Chamber &amp; Calling Station</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-mint shrink-0" />
                  <span>WhatsApp 2-Way Inbox &amp; Billing</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-line space-y-2">
              <button
                type="button"
                onClick={handleStaffClick}
                className="w-full py-3 px-4 rounded-xl bg-ink text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm hover:bg-ink/90 transition-colors"
              >
                <span>Enter Staff Panel</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                type="button"
                onClick={handleDoctorClick}
                className="w-full py-2 px-3 rounded-xl border border-line bg-surface-2 hover:bg-surface-3 text-signal font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
              >
                <Stethoscope className="h-3.5 w-3.5" />
                <span>Or Open Doctor Chamber directly</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info & Remember choice */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-ink-muted pt-2 border-t border-line/60">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberChoice}
              onChange={(e) => setRememberChoice(e.target.checked)}
              className="rounded border-line text-signal focus:ring-signal h-4 w-4"
            />
            <span>Remember my selection on this device</span>
          </label>

          <Link
            href="/login"
            className="text-signal hover:underline font-semibold flex items-center gap-1"
          >
            <span>Have credentials? Go to Sign In</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};
