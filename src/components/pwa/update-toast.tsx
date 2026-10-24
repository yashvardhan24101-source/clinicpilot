"use client";

import React, { useState, useEffect } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function isUserTyping(): boolean {
  if (typeof document === "undefined") return false;
  const active = document.activeElement;
  if (!active || active === document.body) return false;
  const tag = active.tagName.toUpperCase();
  const isEditable =
    (active as HTMLElement).isContentEditable === true ||
    (active as any).contentEditable === "true" ||
    active.getAttribute("contenteditable") === "true";
  return tag === "INPUT" || tag === "TEXTAREA" || isEditable;
}

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
    if (isUserTyping()) {
      // Do not reload while the user is actively typing in any input/textarea
      return;
    }
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
          <p className="text-xs font-bold text-ink font-display">
            New ClinicPilot Version
          </p>
          <p className="text-[11px] text-ink-soft leading-tight">
            An update is ready. Reload when convenient.
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" onClick={handleUpdate} className="gap-1 min-h-[44px] px-3 text-xs shadow-sm">
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Update</span>
          </Button>
          <button
            onClick={() => setUpdateAvailable(false)}
            aria-label="Dismiss update notification"
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
