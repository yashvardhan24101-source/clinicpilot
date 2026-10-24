"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  WifiOff,
  RefreshCw,
  Clock,
  Sparkles,
  Calendar,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLastActiveSnapshot, TodayScheduleSnapshot } from "@/lib/offline-snapshot";

export default function OfflinePage() {
  const [snapshot, setSnapshot] = useState<TodayScheduleSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    getLastActiveSnapshot()
      .then((data) => {
        setSnapshot(data);
      })
      .catch(() => {
        setSnapshot(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleRetry = () => {
    setIsChecking(true);
    setTimeout(() => {
      if (typeof window !== "undefined" && navigator.onLine) {
        window.location.href = "/today";
      } else {
        setIsChecking(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-start p-4 sm:p-6 select-none">
      <div className="max-w-2xl w-full space-y-4">
        {/* Top Header */}
        <div className="flex items-center justify-between py-2 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warn-subtle text-warn border border-warn/30">
              <WifiOff className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-ink font-display">
                ClinicPilot Offline
              </h1>
              <p className="text-xs text-ink-soft">
                PWA Local Cache Mode
              </p>
            </div>
          </div>

          <Button
            onClick={handleRetry}
            disabled={isChecking}
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
            <span>{isChecking ? "Checking..." : "Retry Connection"}</span>
          </Button>
        </div>

        {/* Offline Alert Banner */}
        <div
          role="status"
          aria-live="polite"
          data-testid="offline-cold-start-banner"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              You&apos;re offline.{" "}
              {snapshot
                ? `Showing the schedule from ${snapshot.synced_time_display}. Actions are unavailable until you reconnect.`
                : "No cached schedule available. Actions are unavailable until you reconnect."}
            </span>
          </div>
          {snapshot && (
            <span className="text-[11px] text-amber-800 shrink-0 font-medium ml-2">
              Last synced: {snapshot.synced_time_display}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="p-8 text-center bg-surface-1 rounded-2xl border border-line animate-pulse space-y-3">
            <div className="h-6 w-32 bg-surface-2 rounded-md mx-auto" />
            <div className="h-4 w-48 bg-surface-2 rounded-md mx-auto" />
          </div>
        ) : snapshot && snapshot.appointments.length > 0 ? (
          <div className="space-y-4" data-testid="offline-schedule-container">
            {/* Counts row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-surface-1 rounded-xl p-3 border border-line">
                <span className="text-xs text-ink-soft block font-medium">Booked</span>
                <span className="text-lg font-bold text-ink font-display">
                  {snapshot.appointments.filter((a) => a.status === "booked").length}
                </span>
              </div>
              <div className="bg-surface-1 rounded-xl p-3 border border-line">
                <span className="text-xs text-ink-soft block font-medium">Arrived</span>
                <span className="text-lg font-bold text-ink font-display">
                  {snapshot.appointments.filter((a) => a.status === "arrived").length}
                </span>
              </div>
              <div className="bg-surface-1 rounded-xl p-3 border border-line">
                <span className="text-xs text-ink-soft block font-medium">Completed</span>
                <span className="text-lg font-bold text-ink font-display">
                  {snapshot.appointments.filter((a) => a.status === "completed").length}
                </span>
              </div>
              <div className="bg-surface-1 rounded-xl p-3 border border-line">
                <span className="text-xs text-ink-soft block font-medium">No-Show</span>
                <span className="text-lg font-bold text-ink font-display">
                  {snapshot.appointments.filter((a) => a.status === "no_show").length}
                </span>
              </div>
            </div>

            {/* Offline Schedule List */}
            <div className="bg-surface-1 rounded-2xl border border-line shadow-subtle p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-line-subtle">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-ink font-display">
                  <Calendar className="h-4 w-4 text-signal" />
                  <span>Cached Schedule ({snapshot.date})</span>
                </div>
                <span className="text-[11px] text-ink-soft">
                  {snapshot.appointments.length} appointments
                </span>
              </div>

              <div className="space-y-2">
                {snapshot.appointments.map((apt) => (
                  <div
                    key={apt.id}
                    data-testid="offline-appointment-card"
                    className="flex items-center justify-between p-3 rounded-xl bg-surface-0 border border-line hover:border-line-subtle transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-xs font-bold text-signal bg-signal/10 px-2 py-1 rounded-md shrink-0">
                        {apt.time}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-ink leading-tight">
                          {apt.patient_name_or_initials}
                        </div>
                        <div className="text-xs text-ink-soft">
                          {apt.service} • {apt.doctor}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          apt.status === "completed"
                            ? "bg-ok-subtle text-ok-foreground"
                            : apt.status === "arrived"
                            ? "bg-signal/10 text-signal"
                            : apt.status === "no_show"
                            ? "bg-alert-subtle text-alert"
                            : "bg-surface-2 text-ink-soft"
                        }`}
                      >
                        {apt.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            data-testid="offline-empty-state"
            className="p-8 text-center bg-surface-1 rounded-2xl border border-line shadow-subtle space-y-3"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-ink-soft">
              <Calendar className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-ink font-display">
              No Cached Schedule Available
            </h3>
            <p className="text-xs text-ink-soft max-w-sm mx-auto leading-relaxed">
              Open ClinicPilot with an active internet connection to cache today&apos;s schedule for offline use.
            </p>
          </div>
        )}

        {/* Footer Note */}
        <div className="pt-4 flex items-center justify-center gap-2 text-xs text-ink-faint">
          <Sparkles className="h-3.5 w-3.5 text-signal" />
          <span>ClinicPilot PWA — Offline-First Front Desk Support</span>
        </div>
      </div>
    </div>
  );
}
