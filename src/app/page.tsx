"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Doctor, Appointment } from "@/types/api";
import { api } from "@/lib/api";
import { PatientHeader } from "@/components/patient/patient-header";
import { SymptomsStrip } from "@/components/patient/symptoms-strip";
import { DoctorCard } from "@/components/patient/doctor-card";
import { PatientBookingModal } from "@/components/patient/patient-booking-modal";
import { MyAppointmentsDrawer } from "@/components/patient/my-appointments-drawer";
import { PortalRoleSelector } from "@/components/patient/portal-role-selector";
import { WhatsAppPhoneSimulator } from "@/components/patient/whatsapp-phone-simulator";
import {
  Search,
  Sparkles,
  MapPin,
  Building,
  ArrowRight,
  FilterX,
  Stethoscope,
  ShieldCheck,
  Clock,
  MessageSquare,
  RotateCcw,
} from "lucide-react";

export default function PatientPortalPage() {
  const router = useRouter();
  const [activePortal, setActivePortal] = useState<"prompt" | "patient">("prompt");
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

  // Load patient bookings count and default portal preference
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
    const defaultPortal = localStorage.getItem("clinicpilot_default_portal");
    if (defaultPortal === "patient") {
      setActivePortal("patient");
    } else if (defaultPortal === "staff") {
      router.push("/today");
    }
  }, [router]);

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

  const handleBookingSuccess = (appointment: Appointment) => {
    updateBookingState();
  };

  const handleClearAllFilters = () => {
    setSelectedCity("all");
    setSelectedSpecialty("all");
    setSearchQuery("");
  };

  const hasActiveFilters =
    selectedCity !== "all" || selectedSpecialty !== "all" || searchQuery.trim() !== "";

  // If role is not selected yet, prompt user on home page
  if (activePortal === "prompt") {
    return (
      <PortalRoleSelector
        onSelectPatient={() => setActivePortal("patient")}
        onSelectStaff={() => router.push("/today")}
        onSelectDoctor={() => router.push("/doctor")}
      />
    );
  }

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
          {/* Subtle decorative background glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-signal/5 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 -mb-16 w-48 h-48 rounded-full bg-mint/5 blur-2xl pointer-events-none" />

          <div className="relative max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-signal/10 text-signal text-xs font-bold font-display uppercase tracking-wider mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Instant WhatsApp Booking Pass</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-ink font-display tracking-tight leading-tight">
              Find & Book Verified Doctors in{" "}
              <span className="text-signal">
                {selectedCity === "all" ? "Your City" : selectedCity}
              </span>
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-ink-muted leading-relaxed">
              Search top specialists across dental, general health, skin, cardiology, and more.
              Confirm in-clinic appointments or online video consultations in under 60 seconds.
            </p>

            {/* Big Search Input */}
            <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-ink-faint pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search doctors, disease, clinic, or cause (e.g. Toothache, Root canal, Fever, Acne)..."
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

              {/* City selector on mobile / quick sync */}
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
                100% Verified Practitioners
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="h-3.5 w-3.5 text-signal" />
                Zero Waiting Time Guarantee
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <MessageSquare className="h-3.5 w-3.5 text-mint" />
                Instant WhatsApp Confirmation
              </span>
            </div>
          </div>
        </div>

        {/* Symptoms / Specialties Strip */}
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
                {selectedCity === "all" ? "Showing doctors across all cities" : `Showing doctors in ${selectedCity}`}
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

        {/* Patient Assistance Card */}
        <div className="rounded-2xl border border-line bg-surface-1 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-mint/10 text-mint shrink-0">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink font-display">
                Need Help Finding the Right Doctor?
              </h4>
              <p className="text-xs text-ink-muted">
                Our automated clinic assistant can match your symptoms with the nearest available specialist in your city.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-ink text-xs font-bold border border-line transition-colors shrink-0"
          >
            <span>Search Symptoms Above</span>
            <ArrowRight className="h-3.5 w-3.5 text-signal" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-line bg-surface-1/60 py-6 px-4 text-center text-xs text-ink-faint">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} ClinicPilot. Patient Healthcare Discovery & Telehealth.</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-ink text-signal font-medium">
              Patient Account
            </Link>
            <Link href="/privacy" className="hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-ink">
              Terms
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
