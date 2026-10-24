"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  UserCheck,
  CheckCircle2,
  UserX,
  Plus,
  MoreVertical,
  Calendar,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Appointment, AppointmentStatus } from "@/types/api";
import { formatTimeDisplay, maskPhoneNumber } from "@/lib/utils";
import { offlineQueue } from "@/lib/offline-queue";
import { getClinicMinutesIST, getClinicTimeDisplayIST } from "@/lib/date-helpers";

// TODO: Working hours for open slots must come from each doctor's record (doctor.working_hours),
// not this hardcoded constant (09:00 - 18:00), once database persistence is implemented.
// Standard clinic doctor working hours: 09:00 AM to 06:00 PM (IST)
const WORK_START_MINUTES = 9 * 60; // 540 (09:00)
const WORK_END_MINUTES = 18 * 60; // 1080 (18:00)
const WORK_START_TIME = "09:00";
const WORK_END_TIME = "18:00";

interface TimeRailProps {
  appointments: Appointment[];
  onStatusChange: (id: string, newStatus: AppointmentStatus) => void;
  onOpenQuickBook: (slotTime?: string) => void;
  selectedDoctor?: string;
  isToday?: boolean;
}

export const TimeRail: React.FC<TimeRailProps> = ({
  appointments,
  onStatusChange,
  onOpenQuickBook,
  selectedDoctor = "all",
  isToday = true,
}) => {
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(() => getClinicMinutesIST());
  const [nowDisplay, setNowDisplay] = useState<string>(() => getClinicTimeDisplayIST());

  // Requirement: Update current time indicator every 30-60 seconds using IST minutes
  useEffect(() => {
    const updateTime = () => {
      setCurrentTimeMinutes(getClinicMinutesIST());
      setNowDisplay(getClinicTimeDisplayIST());
    };

    updateTime();
    const interval = setInterval(updateTime, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Helper to convert "HH:mm" to minutes from midnight
  const parseTimeToMinutes = (timeStr: string) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Sort appointments chronologically
  const sortedAppointments = [...appointments].sort(
    (a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time)
  );

  // Identify the "next" immediate upcoming appointment
  const nextApptId = isToday
    ? sortedAppointments.find((a) => {
        const aptMins = parseTimeToMinutes(a.start_time);
        return aptMins >= currentTimeMinutes && (a.status === "booked" || a.status === "arrived");
      })?.id
    : undefined;

  // Determine if NOW marker should be placed after all appointments (only for today)
  const allArePast =
    isToday &&
    sortedAppointments.length > 0 &&
    sortedAppointments.every((a) => parseTimeToMinutes(a.start_time) < currentTimeMinutes);

  // Requirement: Open slots computed per doctor, inside working hours only, NOT for "All Doctors"
  const showPerDoctorSlots = selectedDoctor !== "all";

  // Gap before first appointment (within working hours)
  const firstApt = sortedAppointments[0];
  const firstAptMins = firstApt ? parseTimeToMinutes(firstApt.start_time) : 0;
  const initialGapDuration = firstAptMins - WORK_START_MINUTES;
  const showInitialSlot = showPerDoctorSlots && firstApt && initialGapDuration >= 30;

  // Gap after last appointment (within working hours)
  const lastApt = sortedAppointments[sortedAppointments.length - 1];
  const lastAptEndMins = lastApt ? parseTimeToMinutes(lastApt.end_time) : 0;
  const trailingGapDuration = WORK_END_MINUTES - lastAptEndMins;
  const showTrailingSlot = showPerDoctorSlots && lastApt && trailingGapDuration >= 30;

  return (
    <div data-testid="time-rail" className="relative pl-4 sm:pl-6 space-y-4 select-none">
      {/* The Continuous Vertical Time Rail Line */}
      <div className="absolute left-[29px] sm:left-[37px] top-3 bottom-3 w-[2px] bg-line transition-all" />

      {/* Opening Slot Before First Appointment (Doctor Specific, Inside Working Hours) */}
      {showInitialSlot && (
        <div key="gap-initial-slot" className="relative flex items-center gap-3 py-2 my-1">
          <div className="z-10 flex h-4 w-4 items-center justify-center rounded-full bg-surface-2 border border-line shrink-0" />
          <button
            data-testid="tappable-open-slot"
            onClick={() => onOpenQuickBook(WORK_START_TIME)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-signal/40 bg-signal-subtle/30 text-xs font-medium text-signal hover:border-signal hover:bg-signal-subtle/70 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>
              Open Slot ({initialGapDuration}m available at {formatTimeDisplay(WORK_START_TIME)}) • Tap to book
            </span>
          </button>
        </div>
      )}

      {sortedAppointments.map((apt, index) => {
        const aptMins = parseTimeToMinutes(apt.start_time);
        const isPast = isToday && aptMins < currentTimeMinutes;
        const isNext = apt.id === nextApptId;
        const hasOfflinePending = offlineQueue.hasPending(apt.id);

        // Check if there is an open slot between this appointment and the previous one (Per Doctor Only)
        let gapSlot = null;
        if (showPerDoctorSlots && index > 0) {
          const prevApt = sortedAppointments[index - 1];
          const prevEndMins = parseTimeToMinutes(prevApt.end_time);
          if (aptMins - prevEndMins >= 30) {
            const gapDuration = aptMins - prevEndMins;
            gapSlot = (
              <div
                key={`gap-${prevApt.id}-${apt.id}`}
                className="relative flex items-center gap-3 py-2 my-1"
              >
                {/* Gap node */}
                <div className="z-10 flex h-4 w-4 items-center justify-center rounded-full bg-surface-2 border border-line shrink-0" />
                <button
                  data-testid="tappable-open-slot"
                  onClick={() => onOpenQuickBook(prevApt.end_time)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-signal/40 bg-signal-subtle/30 text-xs font-medium text-signal hover:border-signal hover:bg-signal-subtle/70 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>
                    Open Slot ({gapDuration}m available at{" "}
                    {formatTimeDisplay(prevApt.end_time)}) • Tap to book
                  </span>
                </button>
              </div>
            );
          }
        }

        // Check whether to insert the "NOW" indicator marker right before this appointment (ONLY WHEN TODAY)
        const shouldShowNowBefore =
          isToday &&
          isPast === false &&
          (index === 0 || parseTimeToMinutes(sortedAppointments[index - 1].start_time) < currentTimeMinutes);

        return (
          <React.Fragment key={apt.id}>
            {gapSlot}

            {/* LIVE GLOWING NOW MARKER (ONLY WHEN IS_TODAY=TRUE) */}
            {shouldShowNowBefore && (
              <div data-testid="live-now-marker" className="relative flex items-center gap-3 py-1 my-2 animate-in fade-in">
                {/* Cobalt Glowing Now Dot */}
                <div className="z-20 flex h-5 w-5 items-center justify-center rounded-full bg-signal live-signal-halo ring-4 ring-signal/20 shrink-0 -ml-[1px]">
                  <div className="h-2 w-2 rounded-full bg-white shadow-sm" />
                </div>
                {/* Now Bar across the rail */}
                <div className="flex-1 flex items-center gap-2 bg-signal-subtle/90 border border-signal/30 px-3 py-1 rounded-full text-xs font-semibold text-signal font-display">
                  <span className="h-2 w-2 rounded-full bg-signal animate-ping" />
                  <span>NOW • {nowDisplay}</span>
                  <span className="text-[10px] text-ink-soft font-normal ml-auto hidden sm:inline">
                    Live IST Schedule Position
                  </span>
                </div>
              </div>
            )}

            {/* APPOINTMENT ROW HANGING OFF RAIL */}
            <div
              data-testid={`appointment-row-${apt.id}`}
              className={`relative flex items-start gap-3 transition-opacity ${
                isPast ? "opacity-60 saturate-50" : "opacity-100"
              }`}
            >
              {/* Rail Node Dot */}
              <div
                className={`z-10 mt-3.5 h-3.5 w-3.5 rounded-full border-2 shrink-0 transition-transform ${
                  isNext
                    ? "bg-signal border-white ring-4 ring-signal/30 scale-125"
                    : apt.status === "completed"
                    ? "bg-ok border-white ring-2 ring-ok/20"
                    : apt.status === "arrived"
                    ? "bg-warn border-white ring-2 ring-warn/20"
                    : "bg-surface-1 border-line"
                }`}
              />

              {/* Card Container */}
              <div
                className={`flex-1 rounded-xl border p-3.5 transition-all ${
                  isNext
                    ? "border-signal shadow-md ring-2 ring-signal/25 bg-surface-1 scale-[1.01]"
                    : isPast
                    ? "border-line bg-surface-1/90"
                    : "border-line bg-surface-1 shadow-subtle hover:border-line/80"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  {/* Left Metadata: Time & Patient */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-16 shrink-0 pt-0.5">
                      <span className="font-display tabular-nums text-sm font-bold text-ink block">
                        {formatTimeDisplay(apt.start_time)}
                      </span>
                      <span className="text-[11px] text-ink-soft block font-display">
                        {apt.end_time ? formatTimeDisplay(apt.end_time) : ""}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-ink truncate leading-tight font-devanagari">
                          {apt.patient_name}
                        </h3>
                        {isNext && (
                          <span
                            data-testid="next-appointment-badge"
                            className="px-2 py-0.5 rounded-md bg-signal text-white text-[10px] font-bold uppercase font-display tracking-wider"
                          >
                            Next
                          </span>
                        )}
                        {hasOfflinePending && (
                          <span className="flex items-center gap-1 text-[11px] text-warn font-medium" title="Syncing pending changes...">
                            <Clock className="h-3 w-3 animate-spin" />
                            <span>Pending</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-ink-soft truncate mt-0.5">
                        <span className="font-medium text-ink-soft">{apt.service_name}</span> •{" "}
                        <span>{apt.doctor_name}</span>
                      </p>

                      <p className="text-[11px] text-ink-faint mt-0.5">
                        {maskPhoneNumber(apt.patient_phone)} • via {apt.source}
                      </p>

                      {apt.notes && (
                        <p className="text-[11px] text-ink-soft/90 italic mt-1 bg-surface-2/40 px-2 py-0.5 rounded border border-line-subtle">
                          &ldquo;{apt.notes}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Status Pill + Quick Staff Action Buttons */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <StatusPill status={apt.status} size="sm" />

                    {/* Contextual Action Buttons */}
                    {apt.status === "booked" && (
                      <Button
                        size="sm"
                        variant="ok"
                        onClick={() => onStatusChange(apt.id, "arrived")}
                        className="gap-1 h-8 text-xs px-2.5"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Mark Arrived</span>
                      </Button>
                    )}

                    {apt.status === "arrived" && (
                      <>
                        <Button
                          size="sm"
                          variant="ok"
                          onClick={() => onStatusChange(apt.id, "completed")}
                          className="gap-1 h-8 text-xs px-2.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Complete</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onStatusChange(apt.id, "no_show")}
                          className="text-alert hover:bg-alert-subtle h-8 text-xs px-2"
                          title="Patient left or No-Show"
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </React.Fragment>
        );
      })}

      {/* Trailing Slot After Last Appointment (Doctor Specific, Inside Working Hours) */}
      {showTrailingSlot && (
        <div key="gap-trailing-slot" className="relative flex items-center gap-3 py-2 my-1">
          <div className="z-10 flex h-4 w-4 items-center justify-center rounded-full bg-surface-2 border border-line shrink-0" />
          <button
            data-testid="tappable-open-slot"
            onClick={() => onOpenQuickBook(lastApt.end_time)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-signal/40 bg-signal-subtle/30 text-xs font-medium text-signal hover:border-signal hover:bg-signal-subtle/70 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>
              Open Slot ({trailingGapDuration}m available at {formatTimeDisplay(lastApt.end_time)}) • Tap to book
            </span>
          </button>
        </div>
      )}

      {/* If all appointments are in the past, render NOW marker after the list (ONLY WHEN TODAY) */}
      {allArePast && (
        <div data-testid="live-now-marker" className="relative flex items-center gap-3 py-1 my-2 animate-in fade-in">
          <div className="z-20 flex h-5 w-5 items-center justify-center rounded-full bg-signal live-signal-halo ring-4 ring-signal/20 shrink-0 -ml-[1px]">
            <div className="h-2 w-2 rounded-full bg-white shadow-sm" />
          </div>
          <div className="flex-1 flex items-center gap-2 bg-signal-subtle/90 border border-signal/30 px-3 py-1 rounded-full text-xs font-semibold text-signal font-display">
            <span className="h-2 w-2 rounded-full bg-signal animate-ping" />
            <span>NOW • {nowDisplay}</span>
            <span className="text-[10px] text-ink-soft font-normal ml-auto hidden sm:inline">
              End of Scheduled Appointments
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
