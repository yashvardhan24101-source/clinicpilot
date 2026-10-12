"use client";

import React, { useState } from "react";
import {
  User,
  Phone,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Calendar,
  History,
  Trash2,
  Plus,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { PatientProfile, Appointment } from "@/types/api";
import { formatTimeDisplay, formatDateDisplay, maskPhoneNumber } from "@/lib/utils";

interface PatientProfileSheetProps {
  patient: PatientProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onBookAppointment: (patient: PatientProfile) => void;
  onDeletePatient: (patientId: string) => void;
}

export const PatientProfileSheet: React.FC<PatientProfileSheetProps> = ({
  patient,
  isOpen,
  onClose,
  onBookAppointment,
  onDeletePatient,
}) => {
  const [isPhoneRevealed, setIsPhoneRevealed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!patient) return null;

  const handleDelete = () => {
    onDeletePatient(patient.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const languageLabels: Record<string, string> = {
    en: "English",
    hi: "हिंदी (Hindi)",
    hinglish: "Hinglish",
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between pr-6">
            <SheetTitle>Patient Record</SheetTitle>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-2 border border-line text-ink-soft">
              {languageLabels[patient.language] || patient.language}
            </span>
          </div>
          <SheetDescription>
            Clinical history, WhatsApp consent &amp; visits
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Patient Header Card */}
          <div className="p-4 rounded-xl bg-surface-2/60 border border-line-subtle space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-signal-subtle text-signal font-bold font-display">
                {patient.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-base font-bold text-ink font-devanagari">
                  {patient.name}
                </h3>
                <p className="text-xs text-ink-soft">
                  Patient ID: #{patient.id} • Registered {formatDateDisplay(patient.created_at)}
                </p>
              </div>
            </div>

            {/* Masked Phone with Tap to Reveal */}
            <div className="flex items-center justify-between pt-2 border-t border-line-subtle text-xs">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-ink-faint" />
                <span className="font-display font-medium text-ink">
                  {isPhoneRevealed ? patient.phone : maskPhoneNumber(patient.phone)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPhoneRevealed(!isPhoneRevealed)}
                className="flex items-center gap-1 text-[11px] font-semibold text-signal hover:underline"
              >
                {isPhoneRevealed ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    <span>Hide Phone</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    <span>Reveal Phone</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Consent Status Card */}
          <div className="p-3.5 rounded-xl border border-line bg-surface-1 space-y-2">
            <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider font-display">
              WhatsApp Communication Consent
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-2/50 border border-line-subtle">
                <span className="text-ink-soft">Appointment Alerts</span>
                {patient.consent_status.whatsapp_reminders ? (
                  <span className="flex items-center gap-1 text-ok font-semibold">
                    <CheckCircle className="h-3.5 w-3.5" /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-alert font-semibold">
                    <XCircle className="h-3.5 w-3.5" /> Opted Out
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-surface-2/50 border border-line-subtle">
                <span className="text-ink-soft">Recalls &amp; Promos</span>
                {patient.consent_status.marketing ? (
                  <span className="flex items-center gap-1 text-ok font-semibold">
                    <CheckCircle className="h-3.5 w-3.5" /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-ink-faint font-semibold">
                    <XCircle className="h-3.5 w-3.5" /> Opted Out
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Appointment History */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider font-display flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-signal" />
                <span>Visit History ({patient.appointment_history?.length || 0})</span>
              </h4>
              <span className="text-[11px] text-ink-faint">
                Total Visits: {patient.total_visits}
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-line-subtle">
              {patient.appointment_history && patient.appointment_history.length > 0 ? (
                patient.appointment_history.map((apt) => (
                  <div key={apt.id} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-ink">{apt.service_name}</p>
                      <p className="text-[11px] text-ink-soft">
                        {formatDateDisplay(apt.date)} at {formatTimeDisplay(apt.start_time)} • {apt.doctor_name}
                      </p>
                    </div>
                    <StatusPill status={apt.status} size="sm" />
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-ink-soft bg-surface-2/30 rounded-xl">
                  No appointment history logged yet.
                </div>
              )}
            </div>
          </div>

          {/* Delete Confirmation Warning */}
          {showDeleteConfirm && (
            <div className="p-3 rounded-xl bg-alert-subtle border border-alert/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-alert-foreground">
                <AlertTriangle className="h-4 w-4 text-alert shrink-0" />
                <span>Confirm soft-delete of patient {patient.name}?</span>
              </div>
              <p className="text-[11px] text-ink-soft">
                All scheduled appointments will remain archived.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="h-7 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="alert"
                  onClick={handleDelete}
                  className="h-7 text-xs"
                >
                  Confirm Delete
                </Button>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 border-t border-line-subtle flex items-center justify-between gap-2">
            {!showDeleteConfirm && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-alert hover:bg-alert-subtle gap-1.5 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Record</span>
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => {
                onBookAppointment(patient);
                onClose();
              }}
              className="gap-1.5 ml-auto text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Book Appointment</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
