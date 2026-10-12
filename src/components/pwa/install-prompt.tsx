"use client";

import React, { useState, useEffect } from "react";
import { Download, Share2, X, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if already in standalone PWA mode
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone;

    if (isStandalone) {
      return;
    }

    // Check if dismissed in this session
    if (sessionStorage.getItem("clinicpilot_install_dismissed")) {
      return;
    }

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // On iOS, show prompt after a short delay
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Android/Chrome/Edge beforeinstallprompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Wait 3 seconds to let user see today's view first
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("clinicpilot_install_dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <aside
      aria-label="Install App Banner"
      className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-40 glass-panel rounded-2xl p-4 shadow-elevation border border-line animate-in fade-in slide-in-from-bottom-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-signal text-white shadow-sm shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-bold text-ink font-display">
                Install ClinicPilot
              </h4>
              <span className="flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-ok-subtle text-ok-foreground text-[10px] font-semibold">
                <Sparkles className="h-2.5 w-2.5" />
                PWA
              </span>
            </div>
            <p className="text-xs text-ink-soft leading-snug mt-0.5">
              Instant access from home screen &amp; reliable offline use.
            </p>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="rounded-lg p-1 text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {showIOSInstructions ? (
        <div className="mt-3 pt-3 border-t border-line-subtle text-xs text-ink space-y-1.5 bg-surface-2/60 p-2.5 rounded-xl">
          <p className="font-semibold text-signal flex items-center gap-1">
            <Share2 className="h-3.5 w-3.5" />
            iOS Safari Instructions:
          </p>
          <ol className="list-decimal pl-4 space-y-1 text-ink-soft">
            <li>Tap the <strong>Share</strong> button at the bottom of Safari.</li>
            <li>Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>.</li>
            <li>Tap <strong>Add</strong> in the top right corner.</li>
          </ol>
        </div>
      ) : (
        <div className="mt-3 pt-3 border-t border-line-subtle flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>
            Not now
          </Button>
          <Button size="sm" onClick={handleInstallClick} className="gap-1.5 shadow-sm">
            <Download className="h-3.5 w-3.5" />
            <span>{isIOS ? "How to Install" : "Install App"}</span>
          </Button>
        </div>
      )}
    </aside>
  );
};
