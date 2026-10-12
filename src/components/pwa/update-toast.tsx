"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const UpdateToast: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setUpdateAvailable(true);
          }
        });
      });
    });
  }, []);

  const handleUpdate = () => {
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-16 right-4 z-50 max-w-sm glass-panel rounded-2xl p-3 border border-signal/40 shadow-elevation animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal text-white shadow-sm shrink-0">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h5 className="text-xs font-bold text-ink font-display">
            New ClinicPilot Version
          </h5>
          <p className="text-[11px] text-ink-soft leading-tight">
            An update is ready. Reload when convenient.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" onClick={handleUpdate} className="gap-1 h-8 px-2.5 text-xs shadow-sm">
            <RefreshCw className="h-3 w-3" />
            <span>Update</span>
          </Button>
          <button
            onClick={() => setUpdateAvailable(false)}
            className="p-1 rounded-md text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
