"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  MapPin,
  CalendarCheck,
  ChevronDown,
  User,
  LogOut,
} from "lucide-react";

interface PatientHeaderProps {
  selectedCity: string;
  onCityChange: (city: string) => void;
  onOpenMyAppointments: () => void;
  bookingCount: number;
}

const CITIES = [
  "Mumbai",
  "Delhi NCR",
  "Bengaluru",
  "Pune",
  "Hyderabad",
  "Jaipur",
];

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  selectedCity,
  onCityChange,
  onOpenMyAppointments,
  bookingCount,
}) => {
  const [patientUser, setPatientUser] = useState<{ name: string; phone: string } | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("clinicpilot_current_patient");
      if (stored) {
        setPatientUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleLogoutPatient = () => {
    localStorage.removeItem("clinicpilot_current_patient");
    setPatientUser(null);
  };

  return (
    <header className="sticky top-0 z-40 bg-surface-1/90 backdrop-blur-md border-b border-line px-4 sm:px-6 py-3 transition-all select-none">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & City Dropdown */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-extrabold text-ink font-display tracking-tight leading-none block">
                ClinicPilot
              </span>
              <span className="text-[10px] text-signal font-semibold uppercase tracking-wider font-display leading-none block mt-0.5">
                Patient Portal
              </span>
            </div>
          </Link>

          {/* City Selector */}
          <div className="relative flex items-center">
            <MapPin className="absolute left-2.5 h-3.5 w-3.5 text-signal pointer-events-none" />
            <select
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              className="pl-8 pr-7 py-1.5 rounded-full border border-line bg-surface-2/60 text-xs font-semibold text-ink hover:border-signal/50 focus:outline-none focus:ring-1 focus:ring-signal appearance-none cursor-pointer transition-colors"
            >
              <option value="all">All Cities</option>
              {CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 h-3 w-3 text-ink-faint pointer-events-none" />
          </div>
        </div>

        {/* Right Actions: My Appointments & Patient Profile / Login */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenMyAppointments}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-surface-1 text-xs font-semibold text-ink hover:bg-surface-2 transition-colors relative"
            title="View booked appointments"
          >
            <CalendarCheck className="h-3.5 w-3.5 text-signal" />
            <span className="hidden sm:inline">My Bookings</span>
            {bookingCount > 0 && (
              <span className="flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-signal text-[10px] font-bold text-white font-display">
                {bookingCount}
              </span>
            )}
          </button>

          {patientUser ? (
            <div className="flex items-center gap-1.5 pl-1">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-2 border border-line text-xs font-semibold text-ink">
                <User className="h-3.5 w-3.5 text-signal" />
                <span className="truncate max-w-[110px]">{patientUser.name}</span>
              </div>
              <button
                onClick={handleLogoutPatient}
                className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1 rounded-full text-xs font-medium text-ink-muted hover:text-coral hover:bg-coral/10 transition-colors"
                title="Log out of Patient Account"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-signal text-white text-xs font-semibold hover:bg-signal-hover transition-colors shadow-2xs"
              title="Sign in as Patient"
            >
              <User className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
