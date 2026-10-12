"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Wifi, WifiOff, MessageSquare, HeartPulse, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  clinicName?: string;
  isWhatsAppConnected?: boolean;
  needsStaffCount?: number;
  isOnline?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  clinicName = "SmileCraft Dental Clinic",
  isWhatsAppConnected = true,
  needsStaffCount = 2,
  isOnline = true,
}) => {
  const [waConnected, setWaConnected] = useState(isWhatsAppConnected);

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
              {clinicName}
            </h1>
          </div>
        </div>

        {/* Status Indicators & Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Switch to Patient Portal Button */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-signal/10 hover:bg-signal/20 border border-signal/25 text-xs font-bold text-signal transition-all shadow-2xs group"
            title="Switch to Patient Portal"
          >
            <HeartPulse className="h-3.5 w-3.5 text-signal" />
            <span className="font-display font-semibold">Patient Portal</span>
            <ArrowRight className="h-3 w-3 hidden sm:inline text-signal/70 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          {/* WhatsApp Status Toggle/Badge */}
          <button
            onClick={() => setWaConnected(!waConnected)}
            title={waConnected ? "WhatsApp Bot Active (Tap to test disconnect)" : "WhatsApp Disconnected"}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
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
            <span className="hidden sm:inline font-display">
              {waConnected ? "WA Live" : "WA Disconnected"}
            </span>
          </button>

          {/* Online/Offline indicator */}
          {!isOnline && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-warn-subtle text-warn-foreground text-xs font-medium border border-warn/30">
              <WifiOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Offline</span>
            </div>
          )}

          {/* Needs Staff Indicator (Quick jump to inbox) */}
          {needsStaffCount > 0 && (
            <Link
              href="/inbox"
              className="relative flex items-center justify-center h-8 w-8 rounded-lg bg-surface-2 text-ink-soft hover:text-signal hover:bg-signal-subtle transition-colors"
              title={`${needsStaffCount} conversations need staff attention`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-alert text-[10px] font-bold text-white font-display">
                {needsStaffCount}
              </span>
            </Link>
          )}

          {/* Reception Profile Avatar */}
          <Link href="/more" title="Receptionist profile">
            <Avatar className="h-8 w-8 ring-1 ring-line hover:ring-signal transition-all cursor-pointer">
              <AvatarFallback className="bg-signal-subtle text-signal font-semibold text-xs">
                RD
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
};
