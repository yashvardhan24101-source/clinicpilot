"use client";

import React, { useState, useEffect } from "react";
import { Appointment } from "@/types/api";
import { api } from "@/lib/api";
import { LiveQueueBadge } from "./live-queue-badge";
import { PrescriptionViewerModal } from "./prescription-viewer-modal";
import {
  X,
  CalendarCheck,
  Clock,
  Building,
  Video,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MapPin,
  Calendar,
  FileText,
  Download,
} from "lucide-react";

interface MyAppointmentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  recentBookings?: Appointment[];
  onAppointmentsUpdated?: () => void;
}

export const MyAppointmentsDrawer: React.FC<MyAppointmentsDrawerProps> = ({
  isOpen,
  onClose,
  recentBookings = [],
  onAppointmentsUpdated,
}) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedAppointmentForRx, setSelectedAppointmentForRx] = useState<Appointment | null>(null);
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = JSON.parse(
          localStorage.getItem("clinicpilot_patient_bookings") || "[]"
        ) as Appointment[];
        
        // Merge recentBookings if not already in stored
        const combined = [...recentBookings];
        for (const item of stored) {
          if (!combined.some((c) => c.id === item.id)) {
            combined.push(item);
          }
        }
        setAppointments(combined);
      } catch (err) {
        console.error("Failed to parse bookings from localStorage", err);
        setAppointments(recentBookings);
      }
    }
  }, [isOpen, recentBookings]);

  if (!isOpen) return null;

  const handleCancelAppointment = async (apt: Appointment) => {
    if (!confirm(`Are you sure you want to cancel your appointment with ${apt.doctor_name}?`)) {
      return;
    }

    setCancellingId(apt.id);
    try {
      await api.updateAppointmentStatus(apt.id, "cancelled");

      const updated = appointments.map((a) =>
        a.id === apt.id ? { ...a, status: "cancelled" as const } : a
      );
      setAppointments(updated);
      localStorage.setItem("clinicpilot_patient_bookings", JSON.stringify(updated));
      onAppointmentsUpdated?.();
    } catch (err) {
      console.error("Failed to cancel appointment", err);
    } finally {
      setCancellingId(null);
    }
  };

  const handleOpenPrescription = (apt: Appointment) => {
    setSelectedAppointmentForRx(apt);
    setIsRxModalOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-surface-1 h-full shadow-card flex flex-col border-l border-line animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-2/40">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-signal/10 text-signal">
                <CalendarCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-ink font-display">
                  My Appointments
                </h2>
                <p className="text-xs text-ink-muted">
                  {appointments.length} {appointments.length === 1 ? "booking" : "bookings"} scheduled
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Bookings List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {appointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="h-12 w-12 rounded-full bg-surface-2 flex items-center justify-center text-ink-muted mb-3">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-ink">No Bookings Yet</h3>
                <p className="text-xs text-ink-muted mt-1 max-w-xs">
                  You haven&apos;t booked any doctor appointments yet. Find a doctor in your city and book in seconds!
                </p>
              </div>
            ) : (
              appointments.map((apt) => {
                const isCancelled = apt.status === "cancelled";
                const isCompleted = apt.status === "completed";

                return (
                  <div
                    key={apt.id}
                    className={`rounded-2xl border p-4 space-y-3.5 transition-all ${
                      isCancelled
                        ? "border-line bg-surface-2/40 opacity-75"
                        : "border-line bg-surface-1 shadow-2xs hover:border-signal/30"
                    }`}
                  >
                    {/* Top: Doctor & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-ink font-display">
                          {apt.doctor_name}
                        </h4>
                        <p className="text-xs text-signal font-medium">
                          {apt.service_name}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          isCancelled
                            ? "bg-coral/10 text-coral"
                            : isCompleted
                            ? "bg-surface-2 text-ink-muted"
                            : "bg-mint/10 text-mint"
                        }`}
                      >
                        {isCancelled ? (
                          <>
                            <XCircle className="h-3 w-3" />
                            Cancelled
                          </>
                        ) : isCompleted ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Confirmed
                          </>
                        )}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="space-y-1 text-xs text-ink-muted">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-signal shrink-0" />
                        <span>
                          {apt.date} at {apt.start_time}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {apt.consultation_type === "video" ? (
                          <Video className="h-3.5 w-3.5 text-signal shrink-0" />
                        ) : (
                          <Building className="h-3.5 w-3.5 text-ink-faint shrink-0" />
                        )}
                        <span className="capitalize">
                          {apt.consultation_type === "video" ? "Online Video Consult" : "In-Clinic Visit"}
                        </span>
                      </div>

                      {apt.booking_code && (
                        <div className="text-[11px] font-semibold text-ink-faint pt-1">
                          Pass Code: <strong className="text-ink font-display">#{apt.booking_code}</strong>
                        </div>
                      )}
                    </div>

                    {/* Option 1: Live Queue Badge */}
                    {!isCancelled && apt.consultation_type !== "video" && (
                      <LiveQueueBadge tokenNumber={apt.token_number || 1} />
                    )}

                    {/* Actions: Prescriptions & Cancel */}
                    <div className="pt-2 border-t border-line flex items-center justify-between gap-2">
                      {/* Prescription Download Button */}
                      {!isCancelled ? (
                        <button
                          onClick={() => handleOpenPrescription(apt)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-signal/10 hover:bg-signal/20 text-signal text-xs font-semibold transition-colors"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>View Prescription (Rx)</span>
                        </button>
                      ) : (
                        <span />
                      )}

                      {!isCancelled && !isCompleted && (
                        <button
                          onClick={() => handleCancelAppointment(apt)}
                          disabled={cancellingId === apt.id}
                          className="text-xs font-semibold text-coral hover:underline disabled:opacity-50"
                        >
                          {cancellingId === apt.id ? "Cancelling..." : "Cancel Appointment"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-line bg-surface-2/40 text-center">
            <p className="text-[11px] text-ink-faint">
              Need urgent assistance? Reply to our WhatsApp confirmation message directly.
            </p>
          </div>
        </div>
      </div>

      {/* Prescription Viewer Modal */}
      <PrescriptionViewerModal
        isOpen={isRxModalOpen}
        onClose={() => setIsRxModalOpen(false)}
        appointment={selectedAppointmentForRx}
      />
    </>
  );
};
