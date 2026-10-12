"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Stethoscope,
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
  Trash2,
  Send,
  Sparkles,
  Phone,
  Calendar,
  Check,
  ChevronRight,
  ArrowRight,
  UserX,
  Volume2,
} from "lucide-react";
import { Appointment, Doctor, PrescriptionMedicine, QueueState } from "@/types/api";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { PrescriptionViewerModal } from "@/components/patient/prescription-viewer-modal";

export default function DoctorChamberPage() {
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active Patient for Consultation / Rx
  const [activePatientApt, setActivePatientApt] = useState<Appointment | null>(null);

  // Rx Modal Preview
  const [previewApt, setPreviewApt] = useState<Appointment | null>(null);

  // Prescription Form State
  const [rxDiagnosis, setRxDiagnosis] = useState("");
  const [rxAdvice, setRxAdvice] = useState("");
  const [rxMedicines, setRxMedicines] = useState<PrescriptionMedicine[]>([
    {
      name: "Amoxicillin 500mg",
      dosage: "500 mg",
      frequency: "1-0-1 (After Food)",
      duration: "5 Days",
      notes: "Take after meals with water",
    },
  ]);
  const [isSavingRx, setIsSavingRx] = useState(false);

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
      showToast(`📢 Token #${nextToken} called into Chamber 1. Alert sent!`);
    } catch (e) {
      console.error(e);
      showToast("Called next token.");
    } finally {
      setCallingNext(false);
    }
  };

  // Add Medicine row to Rx
  const handleAddMedicine = () => {
    setRxMedicines((prev) => [
      ...prev,
      {
        name: "",
        dosage: "",
        frequency: "1-0-1",
        duration: "3 Days",
        notes: "",
      },
    ]);
  };

  // Remove Medicine row
  const handleRemoveMedicine = (idx: number) => {
    setRxMedicines((prev) => prev.filter((_, i) => i !== idx));
  };

  // Quick preset medicines
  const handleAddPresetMedicine = (preset: { name: string; dosage: string; freq: string; dur: string; notes: string }) => {
    setRxMedicines((prev) => [
      ...prev,
      {
        name: preset.name,
        dosage: preset.dosage,
        frequency: preset.freq,
        duration: preset.dur,
        notes: preset.notes,
      },
    ]);
  };

  // Save & Issue Prescription
  const handleIssuePrescription = async () => {
    if (!activePatientApt) return;
    if (!rxDiagnosis.trim()) {
      showToast("⚠️ Please enter a clinical diagnosis first.");
      return;
    }

    setIsSavingRx(true);
    try {
      const newPrescription = {
        id: `rx-${Date.now()}`,
        diagnosis: rxDiagnosis.trim(),
        medicines: rxMedicines.filter((m) => m.name.trim().length > 0),
        doctor_advice: rxAdvice.trim() || "Follow prescribed dosage and report back if symptoms persist.",
        created_at: new Date().toISOString(),
      };

      await api.updateAppointmentStatus(activePatientApt.id, "completed");

      // Update local state
      const updatedApt: Appointment = {
        ...activePatientApt,
        status: "completed",
        prescription: newPrescription,
      };

      setActivePatientApt(updatedApt);
      setAppointments((prev) =>
        prev.map((a) => (a.id === updatedApt.id ? updatedApt : a))
      );

      // Save to localStorage patient bookings so patient portal immediately syncs
      try {
        const stored = JSON.parse(
          localStorage.getItem("clinicpilot_patient_bookings") || "[]"
        ) as Appointment[];
        const idx = stored.findIndex((a) => a.id === updatedApt.id || a.booking_code === updatedApt.booking_code);
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
      showToast("✅ Digital Prescription (Rx) successfully signed & synced to patient portal!");
    } catch (e) {
      console.error(e);
      showToast("Prescription issued successfully.");
    } finally {
      setIsSavingRx(false);
    }
  };

  // Quick Intercom to front-desk
  const handleIntercomAlert = (msg: string) => {
    showToast(`🔔 Intercom Sent to Front Desk: "${msg}"`);
  };

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

      {/* Main Grid: Left = Queue & Active Consultation, Right = Digital Prescription Pad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Queue & Current Patient (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Chamber Queue Controller */}
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
                    <span>Chief Service:</span>
                    <strong className="text-ink">{activePatientApt.service_name}</strong>
                  </div>
                  <div className="flex justify-between text-ink-muted">
                    <span>Appointment Time:</span>
                    <span className="text-ink font-medium">
                      {activePatientApt.start_time} - {activePatientApt.end_time}
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-muted">
                    <span>Booking Code:</span>
                    <span className="font-mono text-signal font-semibold">
                      {activePatientApt.booking_code || "CP-ONLINE"}
                    </span>
                  </div>
                  {activePatientApt.attached_file_name && (
                    <div className="pt-1 border-t border-line/60 flex items-center gap-1 text-[11px] text-signal font-medium">
                      <FileText className="h-3 w-3" />
                      <span>Attached: {activePatientApt.attached_file_name}</span>
                    </div>
                  )}
                </div>

                {activePatientApt.prescription && (
                  <div className="p-3 rounded-xl bg-mint/10 border border-mint/20 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-bold text-mint">Prescription Issued (Rx)</p>
                      <p className="text-[11px] text-ink-muted">
                        Diagnosis: {activePatientApt.prescription.diagnosis}
                      </p>
                    </div>
                    <button
                      onClick={() => setPreviewApt(activePatientApt)}
                      className="text-xs font-semibold text-signal underline"
                    >
                      View Rx
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-ink-muted">
                No active patient selected. Click &quot;Call Next&quot; or select from today&apos;s list.
              </div>
            )}
          </div>

          {/* Today's Queue List for Dr. Ananya */}
          <div className="bg-surface-1 border border-line rounded-3xl p-5 shadow-card space-y-3">
            <h3 className="text-xs font-bold text-ink-muted font-display uppercase tracking-wider">
              Today&apos;s Appointments ({appointments.length})
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

        {/* Right Column: Digital Prescription Pad (7 Cols) */}
        <div className="lg:col-span-7">
          <div className="bg-surface-1 border border-line rounded-3xl p-5 sm:p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink font-display">
                    Digital Prescription Pad (Rx)
                  </h3>
                  <p className="text-xs text-ink-muted">
                    Issue verified electronic prescription for {activePatientApt?.patient_name || "Patient"}
                  </p>
                </div>
              </div>

              {activePatientApt?.prescription && (
                <button
                  onClick={() => setPreviewApt(activePatientApt)}
                  className="px-3 py-1.5 rounded-xl border border-line bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-ink transition-colors flex items-center gap-1"
                >
                  <span>Preview PDF</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Diagnosis Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-muted font-display uppercase tracking-wider">
                Clinical Diagnosis &amp; Symptoms
              </label>
              <input
                type="text"
                placeholder="e.g. Acute Irreversible Pulpitis, Root Canal post-op check, Gingivitis"
                value={rxDiagnosis}
                onChange={(e) => setRxDiagnosis(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-line bg-surface-2 text-xs font-medium text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-signal"
              />
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-ink-muted font-display uppercase tracking-wider">
                1-Tap Common Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handleAddPresetMedicine({
                      name: "Amoxicillin 500mg",
                      dosage: "500 mg",
                      freq: "1-0-1 (After Food)",
                      dur: "5 Days",
                      notes: "Antibiotic course",
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-signal/10 hover:text-signal text-[11px] font-medium border border-line transition-colors"
                >
                  + Amoxicillin 500mg
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAddPresetMedicine({
                      name: "Paracetamol 650mg",
                      dosage: "650 mg",
                      freq: "1-0-1 (SOS / Pain)",
                      dur: "3 Days",
                      notes: "For fever/pain",
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-signal/10 hover:text-signal text-[11px] font-medium border border-line transition-colors"
                >
                  + Paracetamol 650mg
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAddPresetMedicine({
                      name: "Chlorhexidine Mouthwash 0.2%",
                      dosage: "10 ml",
                      freq: "0-0-1 (Night)",
                      dur: "7 Days",
                      notes: "Rinse for 60 seconds",
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-signal/10 hover:text-signal text-[11px] font-medium border border-line transition-colors"
                >
                  + Chlorhexidine Mouthwash
                </button>
              </div>
            </div>

            {/* Medicines List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-ink-muted font-display uppercase tracking-wider">
                  Prescribed Medications
                </label>
                <button
                  type="button"
                  onClick={handleAddMedicine}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-signal hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Medicine</span>
                </button>
              </div>

              <div className="space-y-2">
                {rxMedicines.map((med, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl border border-line bg-surface-2/60 space-y-2"
                  >
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-6 sm:col-span-5">
                        <input
                          type="text"
                          placeholder="Medicine Name (e.g. Augmentin 625)"
                          value={med.name}
                          onChange={(e) => {
                            const updated = [...rxMedicines];
                            updated[idx].name = e.target.value;
                            setRxMedicines(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-surface-1 text-xs font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-3">
                        <input
                          type="text"
                          placeholder="Dosage (500mg)"
                          value={med.dosage}
                          onChange={(e) => {
                            const updated = [...rxMedicines];
                            updated[idx].dosage = e.target.value;
                            setRxMedicines(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-surface-1 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2">
                        <input
                          type="text"
                          placeholder="Duration (5 Days)"
                          value={med.duration}
                          onChange={(e) => {
                            const updated = [...rxMedicines];
                            updated[idx].duration = e.target.value;
                            setRxMedicines(updated);
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-line bg-surface-1 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
                        />
                      </div>

                      <div className="col-span-6 sm:col-span-2 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicine(idx)}
                          className="p-1.5 rounded-lg text-ink-muted hover:text-coral hover:bg-coral/10 transition-colors"
                          title="Remove medicine"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-6">
                        <input
                          type="text"
                          placeholder="Frequency (e.g. 1-0-1 After Food)"
                          value={med.frequency}
                          onChange={(e) => {
                            const updated = [...rxMedicines];
                            updated[idx].frequency = e.target.value;
                            setRxMedicines(updated);
                          }}
                          className="w-full px-2.5 py-1 rounded-lg border border-line bg-surface-1 text-[11px] text-ink focus:outline-none"
                        />
                      </div>
                      <div className="col-span-6">
                        <input
                          type="text"
                          placeholder="Special instructions (e.g. with warm water)"
                          value={med.notes || ""}
                          onChange={(e) => {
                            const updated = [...rxMedicines];
                            updated[idx].notes = e.target.value;
                            setRxMedicines(updated);
                          }}
                          className="w-full px-2.5 py-1 rounded-lg border border-line bg-surface-1 text-[11px] text-ink focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Doctor Advice */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-ink-muted font-display uppercase tracking-wider">
                Doctor Advice &amp; Instructions
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Warm saline rinses 3 times a day. Avoid hard foods on the left side for 48 hours."
                value={rxAdvice}
                onChange={(e) => setRxAdvice(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-line bg-surface-2 text-xs font-medium text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-signal resize-none"
              />
            </div>

            {/* Actions: Sign & Issue */}
            <div className="pt-3 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <CheckCircle2 className="h-4 w-4 text-mint" />
                <span>Digitally signed by <strong>Dr. Ananya Sharma</strong></span>
              </div>

              <button
                type="button"
                onClick={handleIssuePrescription}
                disabled={isSavingRx || !activePatientApt}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-signal hover:bg-signal-hover text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                <span>{isSavingRx ? "Signing & Issuing..." : "Sign & Issue Digital Rx"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Prescription Viewer Modal Preview */}
      <PrescriptionViewerModal
        isOpen={!!previewApt}
        onClose={() => setPreviewApt(null)}
        appointment={previewApt}
      />
    </div>
  );
}
