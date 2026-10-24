"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sparkles,
  Phone,
  Calendar,
  Check,
  ChevronRight,
  ArrowRight,
  UserX,
  Volume2,
  MessageSquare,
  Users,
  BellRing,
} from "lucide-react";
import { Appointment, QueueState } from "@/types/api";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function DoctorChamberClient() {
  const { user } = useAuth();
  const [doctorStatus, setDoctorStatus] = useState<"available" | "in_consultation" | "break">(
    "available"
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [queueState, setQueueState] = useState<QueueState>({
    current_token: 1,
    total_waiting: 5,
    avg_wait_minutes_per_patient: 15,
    status: "active",
  });
  const [loading, setLoading] = useState(true);
  const [callingNext, setCallingNext] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Patient for Consultation
  const [activePatientApt, setActivePatientApt] = useState<Appointment | null>(null);

  // Load appointments & queue state
  const loadDoctorData = async () => {
    try {
      const [apts, q] = await Promise.all([
        api.getAppointments(),
        api.getQueue().catch(() => ({
          current_token: 1,
          total_waiting: 5,
          avg_wait_minutes_per_patient: 15,
          status: "active" as const,
        })),
      ]);

      // Filter for Dr. Ananya Sharma (or current logged in doctor)
      const docApts = apts.filter(
        (a) =>
          a.doctor_name.toLowerCase().includes("ananya") ||
          a.doctor_id === "doc-1" ||
          (user?.name && a.doctor_name.toLowerCase().includes(user.name.toLowerCase()))
      );

      setAppointments(docApts.length > 0 ? docApts : apts.slice(0, 8));
      setQueueState(q);

      // Set active patient to arrived/in-progress or first waiting
      const currentPatient =
        docApts.find((a) => a.token_number === q.current_token) ||
        docApts.find((a) => a.status === "arrived") ||
        docApts[0];
      if (currentPatient && !activePatientApt) {
        setActivePatientApt(currentPatient);
      }
    } catch (err) {
      console.error("Failed to load doctor chamber data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctorData();
    const interval = setInterval(loadDoctorData, 15000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Call next patient into chamber
  const handleCallNextPatient = async () => {
    setCallingNext(true);
    try {
      const nextToken = queueState.current_token + 1;
      await api.updateQueue({
        current_token: nextToken,
        total_waiting: Math.max(0, queueState.total_waiting - 1),
      });

      setQueueState((prev) => ({
        ...prev,
        current_token: nextToken,
        total_waiting: Math.max(0, prev.total_waiting - 1),
      }));

      // Find appointment matching nextToken
      const nextApt = appointments.find((a) => a.token_number === nextToken);
      if (nextApt) {
        setActivePatientApt(nextApt);
        await api.updateAppointmentStatus(nextApt.id, "arrived");
      }

      setDoctorStatus("in_consultation");
      showToast(`📢 Token #${nextToken} called into Chamber 1. Alert dispatched!`);
    } catch (e) {
      console.error(e);
      showToast("Called next token.");
    } finally {
      setCallingNext(false);
    }
  };

  // Complete consultation administrative handoff
  const handleCompleteConsultation = async () => {
    if (!activePatientApt) return;
    setIsCompleting(true);
    try {
      await api.updateAppointmentStatus(activePatientApt.id, "completed");

      const updatedApt: Appointment = {
        ...activePatientApt,
        status: "completed",
      };

      setActivePatientApt(updatedApt);
      setAppointments((prev) =>
        prev.map((a) => (a.id === updatedApt.id ? updatedApt : a))
      );

      // Sync to local bookings
      try {
        const stored = JSON.parse(
          localStorage.getItem("clinicpilot_patient_bookings") || "[]"
        ) as Appointment[];
        const idx = stored.findIndex((a) => a.id === updatedApt.id);
        if (idx !== -1) {
          stored[idx] = updatedApt;
        } else {
          stored.unshift(updatedApt);
        }
        localStorage.setItem("clinicpilot_patient_bookings", JSON.stringify(stored));
      } catch (err) {
        console.error(err);
      }

      setDoctorStatus("available");
      showToast(`✅ Consultation completed for ${activePatientApt.patient_name}. Front desk notified for billing.`);
    } catch (e) {
      console.error(e);
      showToast("Consultation marked as completed.");
    } finally {
      setIsCompleting(false);
    }
  };

  // Mark patient as No-Show
  const handleMarkNoShow = async () => {
    if (!activePatientApt) return;
    try {
      await api.updateAppointmentStatus(activePatientApt.id, "cancelled");
      const updatedApt: Appointment = {
        ...activePatientApt,
        status: "cancelled",
      };
      setActivePatientApt(updatedApt);
      setAppointments((prev) =>
        prev.map((a) => (a.id === updatedApt.id ? updatedApt : a))
      );
      setDoctorStatus("available");
      showToast(`Patient ${activePatientApt.patient_name} marked as No-Show.`);
    } catch (e) {
      console.error(e);
      showToast("Marked as No-Show.");
    }
  };

  // Intercom alert to front-desk
  const handleIntercomAlert = (msg: string) => {
    showToast(`🔔 Intercom Sent to Front Desk: "${msg}"`);
  };

  const completedCount = appointments.filter((a) => a.status === "completed").length;
  const remainingCount = appointments.filter((a) => a.status !== "completed" && a.status !== "cancelled").length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-ink text-white text-xs font-semibold shadow-xl animate-in slide-in-from-top-3">
          <Sparkles className="h-4 w-4 text-signal shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Doctor Header & Room Status */}
      <div className="bg-surface-1 border border-line rounded-3xl p-5 sm:p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-signal/10 text-signal shadow-inner shrink-0">
            <Stethoscope className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-ink font-display">
                Dr. Ananya Sharma
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-signal/10 text-signal text-[11px] font-bold font-display uppercase tracking-wider">
                Chamber 1
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              BDS, MDS • Senior Dental Surgeon &amp; Orthodontics • SmileCraft Hub
            </p>
          </div>
        </div>

        {/* Status Toggles & Intercom */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center p-1 rounded-2xl bg-surface-2 border border-line">
            <button
              onClick={() => setDoctorStatus("available")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                doctorStatus === "available"
                  ? "bg-mint text-white shadow-2xs font-display"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              🟢 In Chamber
            </button>
            <button
              onClick={() => setDoctorStatus("in_consultation")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                doctorStatus === "in_consultation"
                  ? "bg-amber text-white shadow-2xs font-display"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              🟡 In Consultation
            </button>
            <button
              onClick={() => setDoctorStatus("break")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                doctorStatus === "break"
                  ? "bg-ink text-white shadow-2xs font-display"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              ⚪ On Break
            </button>
          </div>

          <button
            onClick={() => handleIntercomAlert("Need assistance in Chamber 1")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-surface-1 hover:bg-surface-2 text-xs font-semibold text-ink transition-colors"
            title="Ring Reception Desk"
          >
            <Volume2 className="h-3.5 w-3.5 text-signal" />
            <span>Intercom</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left = Calling Station & Queue, Right = Consultation & Handoff */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Queue & Current Patient (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Chamber Queue Calling Station */}
          <div className="bg-surface-1 border border-line rounded-3xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-ink-muted font-display uppercase tracking-wider">
                  Live Chamber Queue
                </span>
                <h3 className="text-base font-bold text-ink font-display">
                  Calling Station
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-ink-muted font-medium">Now Serving</span>
                <p className="text-xl font-extrabold text-signal font-display leading-none">
                  Token #{queueState.current_token}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-signal/5 border border-signal/20 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-ink">
                  Total Patients Waiting Outside:{" "}
                  <strong className="text-signal">{queueState.total_waiting}</strong>
                </p>
                <p className="text-[11px] text-ink-muted mt-0.5">
                  Est. Avg Consultation: ~15 mins / patient
                </p>
              </div>

              <button
                onClick={handleCallNextPatient}
                disabled={callingNext}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-signal text-white text-xs font-bold hover:bg-signal-hover transition-colors shadow-sm disabled:opacity-50"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>{callingNext ? "Calling..." : "Call Next"}</span>
              </button>
            </div>
          </div>

          {/* Active Patient Card */}
          <div className="bg-surface-1 border border-line rounded-3xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-ink-muted font-display uppercase tracking-wider">
                Current Patient in Chamber
              </span>
              {activePatientApt?.token_number && (
                <span className="px-2 py-0.5 rounded-md bg-signal text-white text-[11px] font-bold font-display">
                  Token #{activePatientApt.token_number}
                </span>
              )}
            </div>

            {activePatientApt ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-ink font-display">
                      {activePatientApt.patient_name}
                    </h4>
                    <p className="text-xs text-ink-muted flex items-center gap-1 mt-0.5">
                      <Phone className="h-3 w-3" />
                      <span>{activePatientApt.patient_phone}</span>
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      activePatientApt.status === "completed"
                        ? "bg-mint/15 text-mint"
                        : "bg-amber/15 text-amber"
                    }`}
                  >
                    {activePatientApt.status}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-2 border border-line text-xs space-y-1">
                  <div className="flex justify-between text-ink-muted">
                    <span>Service:</span>
                    <strong className="text-ink">{activePatientApt.service_name}</strong>
                  </div>
                  <div className="flex justify-between text-ink-muted">
                    <span>Appointment Time:</span>
                    <span className="text-ink font-medium">
                      {activePatientApt.start_time} - {activePatientApt.end_time}
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-muted">
                    <span>Booking Pass Code:</span>
                    <span className="font-mono text-signal font-semibold">
                      {activePatientApt.booking_code || "CP-ONLINE"}
                    </span>
                  </div>
                  {activePatientApt.attached_file_name && (
                    <div className="pt-1 border-t border-line/60 flex items-center gap-1 text-[11px] text-signal font-medium">
                      <FileText className="h-3 w-3" />
                      <span>Attached Report: {activePatientApt.attached_file_name}</span>
                    </div>
                  )}
                </div>

                {/* Consultation Actions */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCompleteConsultation}
                    disabled={isCompleting || activePatientApt.status === "completed"}
                    className="flex-1 py-2 px-3 rounded-xl bg-mint hover:bg-mint/90 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{isCompleting ? "Updating..." : "Mark Completed"}</span>
                  </button>

                  <button
                    onClick={handleMarkNoShow}
                    disabled={activePatientApt.status === "cancelled"}
                    className="py-2 px-3 rounded-xl border border-line bg-surface-2 hover:bg-coral/10 hover:text-coral hover:border-coral/30 text-ink text-xs font-semibold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <UserX className="h-4 w-4" />
                    <span>No-Show</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-ink-muted">
                No active patient in chamber. Click &quot;Call Next&quot; or select from today&apos;s schedule.
              </div>
            )}
          </div>

          {/* Today's Queue List for Dr. Ananya */}
          <div className="bg-surface-1 border border-line rounded-3xl p-5 shadow-card space-y-3">
            <h3 className="text-xs font-bold text-ink-muted font-display uppercase tracking-wider">
              Today&apos;s Chamber Schedule ({appointments.length})
            </h3>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {appointments.map((apt) => (
                <div
                  key={apt.id}
                  onClick={() => setActivePatientApt(apt)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    activePatientApt?.id === apt.id
                      ? "border-signal bg-signal/5 shadow-2xs"
                      : "border-line bg-surface-1 hover:border-signal/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-md bg-surface-2 text-ink font-bold font-display flex items-center justify-center text-[10px]">
                      #{apt.token_number || 1}
                    </span>
                    <div>
                      <p className="font-bold text-ink">{apt.patient_name}</p>
                      <p className="text-[11px] text-ink-muted">{apt.start_time} • {apt.service_name}</p>
                    </div>
                  </div>

                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                      apt.status === "completed"
                        ? "bg-mint/15 text-mint"
                        : apt.status === "arrived"
                        ? "bg-signal/15 text-signal"
                        : "bg-surface-2 text-ink-muted"
                    }`}
                  >
                    {apt.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Administrative Workflow & Front-Desk Handoff (6 Cols) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Chamber Summary Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-surface-1 border border-line rounded-2xl p-4 shadow-subtle text-center">
              <span className="text-[11px] font-bold text-ink-muted font-display uppercase">
                Completed
              </span>
              <p className="text-2xl font-black text-mint font-display mt-1">
                {completedCount}
              </p>
            </div>
            <div className="bg-surface-1 border border-line rounded-2xl p-4 shadow-subtle text-center">
              <span className="text-[11px] font-bold text-ink-muted font-display uppercase">
                In Queue
              </span>
              <p className="text-2xl font-black text-signal font-display mt-1">
                {queueState.total_waiting}
              </p>
            </div>
            <div className="bg-surface-1 border border-line rounded-2xl p-4 shadow-subtle text-center">
              <span className="text-[11px] font-bold text-ink-muted font-display uppercase">
                Remaining
              </span>
              <p className="text-2xl font-black text-ink font-display mt-1">
                {remainingCount}
              </p>
            </div>
          </div>

          {/* Quick Front-Desk Intercom Actions */}
          <div className="bg-surface-1 border border-line rounded-3xl p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal text-white">
                <Volume2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-ink font-display">
                  Front Desk Handoff &amp; Alerts
                </h3>
                <p className="text-xs text-ink-muted">
                  Notify reception staff of patient status &amp; chamber readiness
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleIntercomAlert("Patient completed, ready for billing & discharge")}
                className="w-full p-3 rounded-2xl border border-line bg-surface-2/60 hover:bg-signal/10 hover:border-signal/30 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-ink group-hover:text-signal">
                    💳 Ready for Billing &amp; Invoice
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    Alert reception to prepare invoice for current patient
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-faint group-hover:text-signal" />
              </button>

              <button
                type="button"
                onClick={() => handleIntercomAlert("Assistant needed in Chamber 1")}
                className="w-full p-3 rounded-2xl border border-line bg-surface-2/60 hover:bg-signal/10 hover:border-signal/30 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-ink group-hover:text-signal">
                    👩‍⚕️ Request Clinical Assistant / Nurse
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    Page available staff to assist in Chamber 1
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-faint group-hover:text-signal" />
              </button>

              <button
                type="button"
                onClick={() => handleIntercomAlert("Chamber sanitization requested")}
                className="w-full p-3 rounded-2xl border border-line bg-surface-2/60 hover:bg-signal/10 hover:border-signal/30 text-left transition-colors flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-ink group-hover:text-signal">
                    ✨ Request Chamber Sanitization
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    Clean and prepare operatory before calling next patient
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-faint group-hover:text-signal" />
              </button>
            </div>
          </div>

          {/* Follow-up Recall Navigation Card */}
          <div className="bg-surface-1 border border-line rounded-3xl p-5 shadow-card space-y-3">
            <div className="flex items-center gap-2">
              <BellRing className="h-4 w-4 text-signal" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted font-display">
                Follow-ups &amp; Recalls
              </h4>
            </div>
            <p className="text-xs text-ink-muted leading-relaxed">
              Need to recall this patient in 7 days, 14 days, or 1 month? Clinic follow-ups are coordinated through the front-desk recall workflow.
            </p>
            <Link
              href="/followups"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-signal hover:underline"
            >
              <span>View Clinic Recall System &rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
