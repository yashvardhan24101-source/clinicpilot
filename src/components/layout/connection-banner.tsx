"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, WifiOff } from "lucide-react";

interface ConnectionBannerProps {
  needsStaffCount?: number;
  isOnline?: boolean;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  needsStaffCount = 2,
  isOnline = true,
}) => {
  return (
    <div className="space-y-1">
      {/* Offline Alert */}
      {!isOnline && (
        <div className="bg-warn-subtle border-b border-warn/30 px-4 py-2.5 text-xs text-warn-foreground font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 shrink-0 text-warn" />
            <span>
              You are offline. Showing cached appointments. Changes will sync
              automatically when reconnected.
            </span>
          </div>
        </div>
      )}

      {/* Needs Staff Takeover Strip */}
      {needsStaffCount > 0 && (
        <div className="bg-signal-subtle border-b border-signal/20 px-4 py-2.5 text-xs font-medium text-ink flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-4 w-4 shrink-0 text-signal" />
            <span className="truncate">
              <strong>{needsStaffCount} WhatsApp conversations</strong> require staff attention.
            </span>
          </div>
          <Link
            href="/inbox"
            className="inline-flex items-center gap-1 font-semibold text-signal hover:underline shrink-0 ml-3"
          >
            Open Inbox
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
};
