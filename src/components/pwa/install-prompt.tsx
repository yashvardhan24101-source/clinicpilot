"use client";

import React, { useState, useEffect } from "react";
import { Download, Share2, X, Smartphone, Sparkles, PlusSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export interface InstallPromptProps {
  delayMs?: number;
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({ delayMs }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if already in standalone PWA mode
    const isStandalone =
      (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches) ||
      Boolean((window.navigator as unknown as { standalone?: boolean }).standalone);

    if (isStandalone) {
      return;
    }

    // Check dismissal
    if (
      localStorage.getItem("clinicpilot_ios_install_dismissed") === "true" ||
      sessionStorage.getItem("clinicpilot_install_dismissed") === "true"
    ) {
      return;
    }

    // Detect iOS / iPhone Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const waitTime = typeof delayMs === "number" ? delayMs : isIosDevice ? 1000 : 2500;

    if (isIosDevice) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, waitTime);
      return () => clearTimeout(timer);
    }

    // Android / Chromium beforeinstallprompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => {
        setShowPrompt(true);
      }, waitTime);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [delayMs]);

  const handleInstallClick = async () => {
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
    if (isIOS) {
      localStorage.setItem("clinicpilot_ios_install_dismissed", "true");
    }
    sessionStorage.setItem("clinicpilot_install_dismissed", "true");
  };

  if (!showPrompt) return null;

  // iOS Safari: In-App "Add to Home Screen" Help Card
  if (isIOS) {
    return (
      <aside
        data-testid="ios-install-banner"
        aria-label="Add to Home Screen on iPhone"
        className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-50 bg-surface-1 rounded-2xl p-4 shadow-elevation border border-line animate-in fade-in slide-in-from-bottom-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-signal text-white shadow-sm shrink-0">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-ink font-display">
                  Add to Home Screen
                </h3>
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-signal-subtle text-signal text-[10px] font-semibold">
                  <Sparkles className="h-2.5 w-2.5" />
                  iPhone
                </span>
              </div>
              <p className="text-xs text-ink-soft leading-tight mt-0.5">
                Install ClinicPilot for 1-tap launch &amp; offline schedule access.
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            data-testid="dismiss-ios-install"
            className="rounded-lg p-1.5 text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors shrink-0"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Steps */}
        <div className="mt-3 pt-3 border-t border-line text-xs text-ink bg-surface-2/60 p-2.5 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-ink-soft">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-signal/10 text-signal font-bold text-[11px] shrink-0">
              1
            </span>
            <span>
              Tap the <strong className="text-ink">Share</strong> icon (<Share2 className="h-3 w-3 inline text-signal" />) in Safari&apos;s toolbar.
            </span>
          </div>
          <div className="flex items-center gap-2 text-ink-soft">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-signal/10 text-signal font-bold text-[11px] shrink-0">
              2
            </span>
            <span>
              Scroll down and tap <strong className="text-ink">&quot;Add to Home Screen&quot;</strong> (<PlusSquare className="h-3 w-3 inline text-signal" />).
            </span>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDismiss}
            className="text-xs h-8"
          >
            Got it
          </Button>
        </div>
      </aside>
    );
  }

  // Standard Chromium / Android Banner
  return (
    <aside
      data-testid="standard-install-banner"
      aria-label="Install App Banner"
      className="fixed bottom-20 left-4 right-4 max-w-md mx-auto z-50 bg-surface-1 rounded-2xl p-4 shadow-elevation border border-line animate-in fade-in slide-in-from-bottom-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-signal text-white shadow-sm shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-ink font-display">
                Install ClinicPilot
              </h3>
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-ok-subtle text-ok-foreground text-[10px] font-semibold">
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

      <div className="mt-3 pt-3 border-t border-line-subtle flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          Not now
        </Button>
        <Button size="sm" onClick={handleInstallClick} className="gap-1.5 shadow-sm">
          <Download className="h-3.5 w-3.5" />
          <span>Install App</span>
        </Button>
      </div>
    </aside>
  );
};
