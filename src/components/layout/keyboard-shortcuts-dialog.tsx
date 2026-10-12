"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  Clock,
  CalendarDays,
  CalendarRange,
  MessageSquare,
  Users,
  BellRing,
  FileText,
  CreditCard,
  Keyboard,
  X,
  HeartPulse,
} from "lucide-react";

export const KeyboardShortcutsDialog: React.FC = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Open palette with ? or Ctrl/Cmd + K
      if (e.key === "?" || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      if (e.key === "Escape") {
        setIsOpen(false);
        return;
      }

      // Direct single key navigations when palette is not typing
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case "t":
            router.push("/today");
            setIsOpen(false);
            break;
          case "c":
            router.push("/calendar");
            setIsOpen(false);
            break;
          case "a":
            router.push("/appointments");
            setIsOpen(false);
            break;
          case "i":
            router.push("/inbox");
            setIsOpen(false);
            break;
          case "p":
            router.push("/patients");
            setIsOpen(false);
            break;
          case "f":
            router.push("/followups");
            setIsOpen(false);
            break;
          case "r":
            router.push("/reports");
            setIsOpen(false);
            break;
          case "b":
            router.push("/billing");
            setIsOpen(false);
            break;
          case "d":
            router.push("/");
            setIsOpen(false);
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 lg:bottom-4 right-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-surface-1/90 border border-line text-ink-soft shadow-subtle hover:text-signal hover:border-signal/40 transition-colors backdrop-blur-md"
        title="Keyboard Shortcuts (? or Ctrl+K)"
        aria-label="Keyboard Shortcuts"
      >
        <Keyboard className="h-4 w-4" />
      </button>
    );
  }

  const shortcuts = [
    { key: "T", label: "Today Schedule & Time Rail", icon: Clock, href: "/today" },
    { key: "C", label: "Interactive Calendar Grid", icon: CalendarDays, href: "/calendar" },
    { key: "A", label: "Appointments Directory", icon: CalendarRange, href: "/appointments" },
    { key: "I", label: "WhatsApp Inbox & Chats", icon: MessageSquare, href: "/inbox" },
    { key: "P", label: "Patients Directory", icon: Users, href: "/patients" },
    { key: "F", label: "Follow-ups & Recalls", icon: BellRing, href: "/followups" },
    { key: "R", label: "Lab Reports & PDFs", icon: FileText, href: "/reports" },
    { key: "B", label: "Razorpay Billing & Plans", icon: CreditCard, href: "/billing" },
    { key: "D", label: "Patient Portal (Book Online)", icon: HeartPulse, href: "/" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-2xl bg-surface-1 border border-line p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4 text-signal" />
            <h3 className="text-sm font-bold text-ink font-display">
              Keyboard Shortcuts &amp; Quick Jump
            </h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-ink-soft">
          Press any letter key anywhere to jump directly, or press <kbd className="px-1.5 py-0.5 rounded border border-line bg-surface-2 font-display text-[10px]">Esc</kbd> to close.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {shortcuts.map((sc) => {
            const Icon = sc.icon;
            return (
              <button
                key={sc.key}
                onClick={() => {
                  router.push(sc.href);
                  setIsOpen(false);
                }}
                className="flex items-center justify-between p-2.5 rounded-xl border border-line bg-surface-2/40 hover:bg-signal-subtle hover:border-signal/30 text-left transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-3.5 w-3.5 text-signal shrink-0" />
                  <span className="text-xs font-medium text-ink truncate">
                    {sc.label}
                  </span>
                </div>
                <kbd className="flex h-5 w-5 items-center justify-center rounded border border-line bg-surface-1 text-xs font-bold font-display text-ink-soft shadow-2xs shrink-0 ml-1">
                  {sc.key}
                </kbd>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
