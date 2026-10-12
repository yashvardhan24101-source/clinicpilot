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
import { Row } from "@/components/ui/row";
import { Appointment, AppointmentStatus } from "@/types/api";
import { formatTimeDisplay, maskPhoneNumber } from "@/lib/utils";
import { offlineQueue } from "@/lib/offline-queue";

interface TimeRailProps {
  appointments: Appointment[];
  onStatusChange: (id: string, newStatus: AppointmentStatus) => void;
  onOpenQuickBook: (slotTime?: string) => void;
}

export const TimeRail: React.FC<TimeRailProps> = ({
  appointments,
  onStatusChange,
  onOpenQuickBook,
}) => {
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(0);
  const [nowDisplay, setNowDisplay] = useState<string>("");

  // Update current time indicator every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      setCurrentTimeMinutes(hours * 60 + minutes);
      setNowDisplay(
        now.toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Helper to convert "HH:mm" to minutes from midnight
  const parseTimeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  // Sort appointments chronologically
  const sortedAppointments = [...appointments].sort(
    (a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time)
  );

  // Identify the "next" immediate upcoming appointment
  const nextApptId = sortedAppointments.find((a) => {
    const aptMins = parseTimeToMinutes(a.start_time);
    return aptMins >= currentTimeMinutes && a.status === "booked";
  })?.id;

  return (
    <div className="relative pl-4 sm:pl-6 space-y-4 select-none">
      {/* The Continuous Vertical Time Rail Line */}
      <div className="absolute left-[29px] sm:left-[37px] top-3 bottom-3 w-[2px] bg-line transition-all" />

      {sortedAppointments.map((apt, index) => {
        const aptMins = parseTimeToMinutes(apt.start_time);
        const isPast = aptMins < currentTimeMinutes;
        const isNext = apt.id === nextApptId;
        const hasOfflinePending = offlineQueue.hasPending(apt.id);

        // Check if there is an open slot before this appointment and the previous one
        let gapSlot = null;
        if (index > 0) {
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
                  onClick={() => onOpenQuickBook(prevApt.end_time)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-line text-xs font-medium text-ink-soft hover:border-signal hover:text-signal hover:bg-signal-subtle/50 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>
                    Open Slot ({gapDuration}m available at{" "}
                    {formatTimeDisplay(prevApt.end_time)}) • Tap to book
                  </span>
                </button>
              </div>
            );
          }
        }

        // Check whether to insert the "NOW" indicator marker right before this appointment
        const shouldShowNowBefore =
          isPast === false &&
          (index === 0 || parseTimeToMinutes(sortedAppointments[index - 1].start_time) < currentTimeMinutes);

        return (
          <React.Fragment key={apt.id}>
            {gapSlot}

            {/* LIVE NOW MARKER */}
            {shouldShowNowBefore && (
              <div className="relative flex items-center gap-3 py-1 my-2 animate-in fade-in">
                {/* Cobalt Glowing Now Dot */}
                <div className="z-20 flex h-5 w-5 items-center justify-center rounded-full bg-signal live-signal-halo shrink-0 -ml-[1px]">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
                {/* Now Bar across the rail */}
                <div className="flex-1 flex items-center gap-2 bg-signal-subtle/80 border border-signal/30 px-3 py-1 rounded-full text-xs font-semibold text-signal font-display">
                  <span className="h-1.5 w-1.5 rounded-full bg-signal animate-ping" />
                  <span>NOW • {nowDisplay}</span>
                  <span className="text-[10px] text-ink-soft font-normal ml-auto hidden sm:inline">
                    Live Schedule Position
                  </span>
                </div>
              </div>
            )}

            {/* APPOINTMENT ROW HANGING OFF RAIL */}
            <div
              className={`relative flex items-start gap-3 transition-opacity ${
                isPast && apt.status === "completed" ? "opacity-75" : "opacity-100"
              }`}
            >
              {/* Rail Node Dot */}
              <div
                className={`z-10 mt-3.5 h-3.5 w-3.5 rounded-full border-2 shrink-0 transition-transform ${
                  isNext
                    ? "bg-signal border-white ring-2 ring-signal scale-110"
                    : apt.status === "completed"
                    ? "bg-ok border-white"
                    : apt.status === "arrived"
                    ? "bg-warn border-white"
                    : "bg-surface-1 border-line"
                }`}
              />

              {/* Card Container */}
              <div
                className={`flex-1 rounded-xl border bg-surface-1 p-3.5 shadow-subtle transition-all ${
                  isNext
                    ? "border-signal shadow-md ring-1 ring-signal/20"
                    : "border-line hover:border-line/80"
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
                        <h4 className="text-sm font-bold text-ink truncate leading-tight font-devanagari">
                          {apt.patient_name}
                        </h4>
                        {isNext && (
                          <span className="px-1.5 py-0.2 rounded-md bg-signal text-white text-[10px] font-bold uppercase font-display">
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
    </div>
  );
};
