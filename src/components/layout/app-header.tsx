"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, WifiOff, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

interface AppHeaderProps {
  clinicName?: string;
  isWhatsAppConnected?: boolean;
  needsStaffCount?: number;
  isOnline?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  clinicName,
  isWhatsAppConnected = true,
  needsStaffCount = 0,
  isOnline = true,
}) => {
  const { user } = useAuth();
  const isDemo =
    typeof process !== "undefined" &&
    (process.env.NEXT_PUBLIC_DEMO_MODE === "true" || process.env.DEMO_MODE === "true");
  const [waConnected, setWaConnected] = useState(isDemo ? isWhatsAppConnected : false);

  const displayClinicName = user?.clinic_name || clinicName || "Clinic";
  const initials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : "ST";

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b transition-colors select-none">
      <div className="flex h-14 items-center justify-between px-4 max-w-7xl mx-auto">
        {/* Brand & Clinic Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal text-white shadow-sm shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="block text-xs font-semibold text-signal uppercase tracking-wider font-display leading-none">
              ClinicPilot
            </span>
            <h1 className="text-sm font-semibold text-ink truncate leading-tight">
              {displayClinicName}
            </h1>
          </div>
        </div>

        {/* Status Indicators & Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* WhatsApp Status Toggle/Badge */}
          {isDemo ? (
            <button
              type="button"
              onClick={() => setWaConnected(!waConnected)}
              aria-label={
                waConnected
                  ? "WA Live - WhatsApp Bot Active (Tap to test disconnect)"
                  : "WA Disconnected - WhatsApp Bot Offline"
              }
              title={
                waConnected
                  ? "WA Live - WhatsApp Bot Active (Tap to test disconnect)"
                  : "WA Disconnected - WhatsApp Bot Offline"
              }
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-full text-xs font-medium border transition-colors focus-visible:ring-2 focus-visible:ring-signal",
                waConnected
                  ? "bg-ok-subtle text-ok-foreground border-ok/30"
                  : "bg-alert-subtle text-alert-foreground border-alert/30 animate-pulse"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  waConnected ? "bg-ok" : "bg-alert"
                )}
              />
              <span className="font-display">
                {waConnected ? "WA Live" : "WA Disconnected"}
              </span>
            </button>
          ) : (
            <div
              role="status"
              aria-label="WhatsApp: not connected"
              title="WhatsApp: not connected (integration pending)"
              className="flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] rounded-full text-xs font-medium border transition-colors bg-surface-2 text-ink-muted border-line"
            >
              <span className="h-2 w-2 rounded-full bg-ink-faint" />
              <span className="font-display">WhatsApp: not connected</span>
            </div>
          )}

          {/* Online/Offline indicator */}
          {!isOnline && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-full bg-warn-subtle text-warn-foreground text-xs font-medium border border-warn/30"
            >
              <WifiOff className="h-3.5 w-3.5" />
              <span>Offline</span>
            </div>
          )}

          {/* Needs Staff Indicator (Quick jump to inbox) */}
          {needsStaffCount > 0 && (
            <Link
              href="/inbox"
              aria-label={`${needsStaffCount} conversations need staff attention`}
              className="relative flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg bg-surface-2 text-ink-soft hover:text-signal hover:bg-signal-subtle transition-colors focus-visible:ring-2 focus-visible:ring-signal"
              title={`${needsStaffCount} conversations need staff attention`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-alert text-[10px] font-bold text-white font-display">
                {needsStaffCount}
              </span>
            </Link>
          )}

          {/* Staff Profile Avatar */}
          <Link
            href="/more"
            aria-label={user ? `${initials} - Profile for ${user.name} (${user.role})` : `${initials} - Staff Profile`}
            title={user ? `${user.name} (${user.role})` : "Staff Profile"}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg focus-visible:ring-2 focus-visible:ring-signal"
          >
            <Avatar className="h-8 w-8 ring-1 ring-line hover:ring-signal transition-all cursor-pointer">
              <AvatarFallback aria-hidden="true" className="bg-signal-subtle text-signal font-semibold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
};
