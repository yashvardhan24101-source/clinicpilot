"use client";

import React from "react";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Stethoscope,
  FileText,
  UserCheck,
  CheckCircle2,
  UserX,
  XCircle,
  CalendarRange,
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
import { Appointment, AppointmentStatus } from "@/types/api";
import { formatTimeDisplay, formatDateDisplay, maskPhoneNumber } from "@/lib/utils";

interface AppointmentDetailSheetProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (id: string, status: AppointmentStatus) => void;
  onOpenReschedule: (appointment: Appointment) => void;
}

export const AppointmentDetailSheet: React.FC<AppointmentDetailSheetProps> = ({
  appointment,
  isOpen,
  onClose,
  onStatusChange,
  onOpenReschedule,
}) => {
  if (!appointment) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-w-md mx-auto">
        <SheetHeader>
          <div className="flex items-center justify-between pr-6">
            <SheetTitle>Appointment Details</SheetTitle>
            <StatusPill status={appointment.status} size="sm" />
          </div>
          <SheetDescription>
            Patient schedule &amp; clinic intake status
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Patient Card */}
          <div className="p-3.5 rounded-xl bg-surface-2/60 border border-line-subtle space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-signal shrink-0" />
              <span className="text-base font-bold text-ink font-devanagari">
                {appointment.patient_name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-ink-soft">
              <Phone className="h-3.5 w-3.5 text-ink-faint" />
              <span className="font-display">
                {maskPhoneNumber(appointment.patient_phone)}
              </span>
              <span className="text-ink-faint">• via {appointment.source}</span>
            </div>
          </div>

          {/* Time & Doctor Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl border border-line bg-surface-1 space-y-1">
              <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider font-display flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-signal" />
                Time Slot
              </span>
              <p className="font-bold text-ink font-display text-sm">
                {formatTimeDisplay(appointment.start_time)} - {formatTimeDisplay(appointment.end_time)}
              </p>
              <p className="text-ink-soft text-[11px]">{formatDateDisplay(appointment.date)}</p>
            </div>

            <div className="p-3 rounded-xl border border-line bg-surface-1 space-y-1">
              <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider font-display flex items-center gap-1">
                <Stethoscope className="h-3.5 w-3.5 text-signal" />
                Doctor
              </span>
              <p className="font-bold text-ink truncate text-sm">
                {appointment.doctor_name}
              </p>
              <p className="text-ink-soft text-[11px] truncate">{appointment.service_name}</p>
            </div>
          </div>

          {/* Notes */}
          {appointment.notes && (
            <div className="p-3 rounded-xl border border-line-subtle bg-surface-1 space-y-1">
              <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider font-display flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-ink-faint" />
                Intake Notes
              </span>
              <p className="text-xs text-ink-soft italic leading-relaxed">
                &ldquo;{appointment.notes}&rdquo;
              </p>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-2 border-t border-line-subtle space-y-2">
            <span className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider font-display block">
              Quick Actions
            </span>
            <div className="grid grid-cols-2 gap-2">
              {appointment.status !== "arrived" && appointment.status !== "completed" && (
                <Button
                  size="sm"
                  variant="ok"
                  onClick={() => {
                    onStatusChange(appointment.id, "arrived");
                    onClose();
                  }}
                  className="gap-1.5"
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Mark Arrived</span>
                </Button>
              )}

              {appointment.status !== "completed" && (
                <Button
                  size="sm"
                  variant="ok"
                  onClick={() => {
                    onStatusChange(appointment.id, "completed");
                    onClose();
                  }}
                  className="gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Mark Complete</span>
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onOpenReschedule(appointment);
                  onClose();
                }}
                className="gap-1.5"
              >
                <CalendarRange className="h-4 w-4" />
                <span>Reschedule</span>
              </Button>

              {appointment.status !== "no_show" && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onStatusChange(appointment.id, "no_show");
                    onClose();
                  }}
                  className="text-alert hover:bg-alert-subtle gap-1.5"
                >
                  <UserX className="h-4 w-4" />
                  <span>No-Show</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
