"use client";

import React, { useState } from "react";
import { X, UserPlus, CheckCircle2 } from "lucide-react";
import { UserSession } from "@/types/auth";

interface GoogleAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAccount: (account: {
    email: string;
    name: string;
    avatar: string;
    role: "patient" | "doctor" | "receptionist";
  }) => void;
}

export const GoogleLogo: React.FC<{ className?: string }> = ({ className = "h-4 w-4" }) => (
  <svg className={className} viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.42 7.34 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.58 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
    />
  </svg>
);

export const GoogleAccountModal: React.FC<GoogleAccountModalProps> = ({
  isOpen,
  onClose,
  onSelectAccount,
}) => {
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  if (!isOpen) return null;

  const defaultAccounts = [
    {
      name: "Yashvardhan",
      email: "yashvardhan24101@iiitnr.edu.in",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Yashvardhan",
      role: "patient" as const,
      badge: "Patient Portal",
    },
    {
      name: "Dr. Ananya Sharma",
      email: "dr.ananya.sharma@gmail.com",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=Dr+Ananya",
      role: "doctor" as const,
      badge: "Doctor Chamber",
    },
    {
      name: "SmileCraft Reception",
      email: "reception.smilecraft@gmail.com",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=SmileCraft",
      role: "receptionist" as const,
      badge: "Clinic Front Desk",
    },
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail) return;
    const name = customName || customEmail.split("@")[0].replace(/[._]/g, " ");
    onSelectAccount({
      email: customEmail,
      name,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      role: customEmail.includes("doctor") ? "doctor" : "patient",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-3xl bg-surface-1 border border-line shadow-2xl overflow-hidden p-6 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <GoogleLogo className="h-6 w-6" />
            <div>
              <h3 className="text-base font-bold text-ink font-display">
                Sign in with Google
              </h3>
              <p className="text-xs text-ink-muted">Choose an account for ClinicPilot</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-surface-2 text-ink-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Account list */}
        <div className="space-y-2 border-y border-line py-3">
          {defaultAccounts.map((acc) => (
            <button
              key={acc.email}
              onClick={() => onSelectAccount(acc)}
              className="w-full flex items-center justify-between p-2.5 rounded-2xl hover:bg-surface-2 border border-transparent hover:border-line transition-all group text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={acc.avatar}
                  alt={acc.name}
                  className="h-9 w-9 rounded-full border border-line shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-ink truncate group-hover:text-signal transition-colors">
                    {acc.name}
                  </p>
                  <p className="text-[11px] text-ink-muted truncate">{acc.email}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-surface-2 text-[10px] font-semibold text-ink-muted shrink-0 group-hover:bg-signal/10 group-hover:text-signal">
                {acc.badge}
              </span>
            </button>
          ))}

          {/* Option to use custom Google email */}
          {!showCustomInput ? (
            <button
              onClick={() => setShowCustomInput(true)}
              className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-surface-2 text-xs font-semibold text-signal transition-colors"
            >
              <div className="h-9 w-9 rounded-full bg-signal/10 flex items-center justify-center shrink-0">
                <UserPlus className="h-4 w-4 text-signal" />
              </div>
              <span>Use another Google account</span>
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="pt-2 space-y-2">
              <input
                type="email"
                placeholder="Enter your Gmail address"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
              />
              <input
                type="text"
                placeholder="Your full name (optional)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-xs text-ink focus:outline-none focus:ring-1 focus:ring-signal"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-signal text-white text-xs font-bold hover:bg-signal-hover transition-colors"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustomInput(false)}
                  className="py-2 px-3 rounded-xl border border-line text-xs font-semibold text-ink-muted hover:bg-surface-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security footer */}
        <p className="text-[11px] text-ink-faint text-center">
          To continue, Google will share your name, email address, and profile picture with ClinicPilot.
        </p>
      </div>
    </div>
  );
};
