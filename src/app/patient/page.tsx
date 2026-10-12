"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Doctor, Appointment } from "@/types/api";
import { api } from "@/lib/api";
import { PatientHeader } from "@/components/patient/patient-header";
import { SymptomsStrip } from "@/components/patient/symptoms-strip";
import { DoctorCard } from "@/components/patient/doctor-card";
import { PatientBookingModal } from "@/components/patient/patient-booking-modal";
import { MyAppointmentsDrawer } from "@/components/patient/my-appointments-drawer";
import { WhatsAppPhoneSimulator } from "@/components/patient/whatsapp-phone-simulator";
import {
  Search,
  Sparkles,
  MapPin,
  ArrowRight,
  FilterX,
  Stethoscope,
  ShieldCheck,
  Clock,
  MessageSquare,
} from "lucide-react";

export default function PatientPortalPage() {
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals & Drawers
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState<Doctor | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [isMyAppointmentsOpen, setIsMyAppointmentsOpen] = useState<boolean>(false);
  const [bookingCount, setBookingCount] = useState<number>(0);
  const [recentBookings, setRecentBookings] = useState<Appointment[]>([]);

  // Load patient bookings count
  const updateBookingState = () => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("clinicpilot_patient_bookings") || "[]"
      ) as Appointment[];
      setRecentBookings(stored);
      setBookingCount(stored.filter((a) => a.status !== "cancelled").length);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    updateBookingState();
  }, []);

  // Fetch doctors based on active filters
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    api
      .getDoctors({
        city: selectedCity,
        specialty: selectedSpecialty,
        q: searchQuery.trim() || undefined,
      })
      .then((data) => {
        if (!isCancelled) {
          setDoctors(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching doctors", err);
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedCity, selectedSpecialty, searchQuery]);

  const handleOpenBooking = (doctor: Doctor) => {
    setSelectedDoctorForBooking(doctor);
    setIsBookingModalOpen(true);
  };

  const handleBookingSuccess = () => {
    updateBookingState();
  };

  const handleClearAllFilters = () => {
    setSelectedCity("all");
    setSelectedSpecialty("all");
    setSearchQuery("");
  };

  const hasActiveFilters =
    selectedCity !== "all" || selectedSpecialty !== "all" || searchQuery.trim() !== "";

  return (
    <div className="min-h-screen bg-frost text-ink flex flex-col font-sans">
      {/* Top Header */}
      <PatientHeader
        selectedCity={selectedCity}
        onCityChange={(city) => setSelectedCity(city)}
        onOpenMyAppointments={() => setIsMyAppointmentsOpen(true)}
        bookingCount={bookingCount}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-b from-surface-1 to-surface-2 border border-line p-6 sm:p-10 shadow-sm">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-signal/5 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 -mb-16 w-48 h-48 rounded-full bg-mint/5 blur-2xl pointer-events-none" />

          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-signal/10 text-signal text-xs font-bold font-display uppercase tracking-wider mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Instant WhatsApp Booking Pass</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-ink font-display tracking-tight leading-tight">
              Book Appointments with Clinic Doctors in{" "}
              <span className="text-signal">
                {selectedCity === "all" ? "Your Area" : selectedCity}
              </span>
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
              Select available clinic doctors and consultants.
              Confirm in-clinic appointments or online video consultations in under 60 seconds.
            </p>

            {/* Search Input */}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-ink-faint pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search clinic doctors by name or specialty..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-line bg-surface-1 text-xs sm:text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/20 shadow-2xs transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-3.5 text-xs text-ink-faint hover:text-ink"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* City selector */}
              <div className="sm:w-48 shrink-0">
                <div className="relative h-full flex items-center">
                  <MapPin className="absolute left-3 h-4 w-4 text-signal pointer-events-none" />
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full h-full min-h-[46px] pl-9 pr-6 py-2.5 rounded-2xl border border-line bg-surface-1 text-xs font-semibold text-ink appearance-none cursor-pointer focus:outline-none focus:border-signal focus:ring-2 focus:ring-signal/20 shadow-2xs"
                  >
                    <option value="all">All Cities</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Delhi NCR">Delhi NCR</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Pune">Pune</option>
                    <option value="Hyderabad">Hyderabad</option>
                    <option value="Jaipur">Jaipur</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Value Badges */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-ink-muted">
              <span className="flex items-center gap-1.5 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-mint" />
                Registered Clinic Doctors
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="h-3.5 w-3.5 text-signal" />
                Live Waiting Token Tracking
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <MessageSquare className="h-3.5 w-3.5 text-mint" />
                Instant WhatsApp Confirmation
              </span>
            </div>
          </div>
        </div>

        {/* Clinic Specialty Strip */}
        <SymptomsStrip
          selectedSpecialty={selectedSpecialty}
          onSelectSpecialty={(spec) => setSelectedSpecialty(spec)}
        />

        {/* Doctor Listings Header & Active Filter Pills */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-ink font-display">
                Available Doctors ({doctors.length})
              </h2>
              <p className="text-xs text-ink-muted">
                {selectedCity === "all" ? "Showing doctors across all locations" : `Showing doctors in ${selectedCity}`}
                {selectedSpecialty !== "all" && ` for ${selectedSpecialty}`}
              </p>
            </div>

            {hasActiveFilters && (
              <button
                onClick={handleClearAllFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-coral hover:underline self-start sm:self-auto"
              >
                <FilterX className="h-3.5 w-3.5" />
                Reset all filters
              </button>
            )}
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {selectedCity !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-2 border border-line text-xs font-medium text-ink">
                  <span>City: <strong>{selectedCity}</strong></span>
                  <button
                    onClick={() => setSelectedCity("all")}
                    className="text-ink-muted hover:text-ink ml-1 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}

              {selectedSpecialty !== "all" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-2 border border-line text-xs font-medium text-ink">
                  <span>Specialty: <strong>{selectedSpecialty}</strong></span>
                  <button
                    onClick={() => setSelectedSpecialty("all")}
                    className="text-ink-muted hover:text-ink ml-1 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}

              {searchQuery.trim() !== "" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-2 border border-line text-xs font-medium text-ink">
                  <span>Search: <strong>&ldquo;{searchQuery}&rdquo;</strong></span>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="text-ink-muted hover:text-ink ml-1 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Doctor Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-line bg-surface-1 p-6 h-52 animate-pulse space-y-4"
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-surface-2" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/2 bg-surface-2 rounded-md" />
                    <div className="h-3 w-1/3 bg-surface-2 rounded-md" />
                  </div>
                </div>
                <div className="h-3 w-full bg-surface-2 rounded-md" />
                <div className="h-10 w-full bg-surface-2 rounded-xl mt-4" />
              </div>
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="rounded-3xl border border-line bg-surface-1 p-12 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-surface-2 flex items-center justify-center mx-auto text-ink-muted">
              <Stethoscope className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-ink font-display">
                No Doctors Found
              </h3>
              <p className="text-xs text-ink-muted max-w-sm mx-auto mt-1">
                We couldn&apos;t find any doctors matching your specific filter criteria.
                Try choosing &ldquo;All Cities&rdquo; or clearing your search term.
              </p>
            </div>
            <button
              onClick={handleClearAllFilters}
              className="px-4 py-2 rounded-xl bg-signal text-white text-xs font-semibold hover:bg-signal-hover transition-colors inline-flex items-center gap-2 shadow-sm"
            >
              <FilterX className="h-3.5 w-3.5" />
              Clear Filters & Show All Doctors
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                onBook={handleOpenBooking}
              />
            ))}
          </div>
        )}

        {/* Clinic Assistance Card */}
        <div className="rounded-2xl border border-line bg-surface-1 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-mint/10 text-mint shrink-0">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink font-display">
                Need Help Scheduling?
              </h4>
              <p className="text-xs text-ink-muted">
                Our clinic reception desk is available for instant queries, slot reschedules, or directions.
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink text-xs font-bold border border-line transition-colors shrink-0"
          >
            <span>Clinic Staff Login</span>
            <ArrowRight className="h-3.5 w-3.5 text-signal" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-surface-1/60 py-6 px-4 text-center text-xs text-ink-faint">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} ClinicPilot. Clinic Operations &amp; Appointment Scheduling.</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-ink text-signal font-medium">
              Staff &amp; Patient Login
            </Link>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      <PatientBookingModal
        doctor={selectedDoctorForBooking}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onBookingSuccess={handleBookingSuccess}
      />

      {/* My Appointments Drawer */}
      <MyAppointmentsDrawer
        isOpen={isMyAppointmentsOpen}
        onClose={() => setIsMyAppointmentsOpen(false)}
        recentBookings={recentBookings}
        onAppointmentsUpdated={updateBookingState}
      />

      {/* Floating Live WhatsApp Notification Phone Simulator */}
      <WhatsAppPhoneSimulator />
    </div>
  );
}
