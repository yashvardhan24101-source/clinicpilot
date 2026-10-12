"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { WifiOff, RefreshCw, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const [isChecking, setIsChecking] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>("Recently");

  useEffect(() => {
    const time = new Date().toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    setLastSynced(time);
  }, []);

  const handleRetry = () => {
    setIsChecking(true);
    setTimeout(() => {
      if (typeof window !== "undefined" && navigator.onLine) {
        window.location.href = "/today";
      } else {
        setIsChecking(false);
      }
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-md w-full bg-surface-1 rounded-2xl border border-line p-8 shadow-subtle space-y-6">
        {/* Signal Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-warn-subtle text-warn border border-warn/30">
          <WifiOff className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-warn-foreground font-display">
            Offline Mode Active
          </span>
          <h2 className="text-2xl font-bold text-ink font-display">
            No Internet Connection
          </h2>
          <p className="text-sm text-ink-soft leading-relaxed">
            ClinicPilot continues operating offline with your last synced schedule (cached around {lastSynced}).
          </p>
        </div>

        {/* What works offline */}
        <div className="bg-surface-2/60 rounded-xl p-4 text-left space-y-2.5 border border-line-subtle text-xs text-ink-soft">
          <span className="font-semibold text-ink block font-display">
            What you can still do right now:
          </span>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-ok shrink-0 mt-0.5" />
            <span>View Today&apos;s scheduled patient appointments</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-ok shrink-0 mt-0.5" />
            <span>Check patient phone numbers and arrival queue</span>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-warn shrink-0 mt-0.5" />
            <span>Mark arrived or complete (actions queue and sync on reconnect)</span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={handleRetry}
            disabled={isChecking}
            className="w-full gap-2 shadow-sm"
            size="lg"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? "animate-spin" : ""}`} />
            <span>{isChecking ? "Checking Connection..." : "Retry Connection"}</span>
          </Button>

          <Link href="/today" className="block">
            <Button variant="outline" className="w-full" size="default">
              Return to Cached Schedule
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-ink-faint">
        <Sparkles className="h-3.5 w-3.5 text-signal" />
        <span>ClinicPilot Progressive Web App</span>
      </div>
    </div>
  );
}
