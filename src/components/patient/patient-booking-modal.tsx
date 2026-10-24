"use client";

import React, { useState } from "react";
import { Doctor, Appointment } from "@/types/api";
import { api } from "@/lib/api";
import { getClinicTodayIST } from "@/lib/date-helpers";
import { LiveQueueBadge } from "./live-queue-badge";
import {
  X,
  Calendar,
  Clock,
  Video,
  Building,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Copy,
  Paperclip,
} from "lucide-react";

interface PatientBookingModalProps {
  doctor: Doctor | null;
  isOpen: boolean;
  onClose: () => void;
  onBookingSuccess: (appointment: Appointment) => void;
}

export const PatientBookingModal: React.FC<PatientBookingModalProps> = ({
  doctor,
  isOpen,
  onClose,
  onBookingSuccess,
}) => {
  // Steps: 1 = Mode & Slot, 2 = Patient Details, 3 = Confirmed Pass
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [consultationType, setConsultationType] = useState<"in_clinic" | "video">("in_clinic");
  
  // Date picker
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86400000);
  const dayAfter = new Date(Date.now() + 172800000);

  const formatDateYMD = (d: Date) => getClinicTodayIST(d);
  const formatDateLabel = (d: Date) =>
    d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  const dateOptions = [
    { label: `Today (${formatDateLabel(today)})`, value: formatDateYMD(today) },
    { label: `Tomorrow (${formatDateLabel(tomorrow)})`, value: formatDateYMD(tomorrow) },
    { label: formatDateLabel(dayAfter), value: formatDateYMD(dayAfter) },
  ];

  const [selectedDate, setSelectedDate] = useState<string>(dateOptions[0].value);
  const [selectedSlot, setSelectedSlot] = useState<string>("11:00");

  // Form Fields
  const [patientName, setPatientName] = useState<string>("");
  const [patientPhone, setPatientPhone] = useState<string>("");
  const [patientAge, setPatientAge] = useState<string>("");
  const [patientGender, setPatientGender] = useState<string>("Male");
  const [symptoms, setSymptoms] = useState<string>("");
  const [attachedFileName, setAttachedFileName] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen || !doctor) return null;

  const MORNING_SLOTS = ["09:30", "10:15", "11:00", "11:45"];
  const AFTERNOON_SLOTS = ["12:30", "01:15", "02:30", "03:15"];
  const EVENING_SLOTS = ["04:30", "05:15", "06:00", "07:00"];

  const handleNextToDetails = () => {
    setError(null);
    setStep(2);
  };

  const handleBackToSlots = () => {
    setError(null);
    setStep(1);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!patientName.trim()) {
      setError("Please enter the patient's full name.");
      return;
    }

    const cleanPhone = patientPhone.trim().replace(/\s+/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number for WhatsApp confirmation.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedPhone = cleanPhone.startsWith("+91")
        ? cleanPhone
        : `+91 ${cleanPhone.replace(/^0+/, "")}`;

      // Calculate end time (30 mins after slot)
      const [h, m] = selectedSlot.split(":").map(Number);
      const endH = m + 30 >= 60 ? h + 1 : h;
      const endM = (m + 30) % 60;
      const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

      const bookingCode = `CP-${Math.floor(1000 + Math.random() * 9000)}`;

      const newApt = await api.createAppointment({
        doctor_id: doctor.id,
        doctor_name: doctor.name,
        service_name: doctor.specialty,
        date: selectedDate,
        start_time: selectedSlot,
        end_time: endTime,
        patient_name: patientName.trim(),
        patient_phone: formattedPhone,
        consultation_type: consultationType,
        patient_age: patientAge ? parseInt(patientAge, 10) : undefined,
        patient_gender: patientGender,
        booking_code: bookingCode,
        attached_file_name: attachedFileName || undefined,
        notes: symptoms.trim() || undefined,
        source: "online",
        status: "booked",
      });

      // Save locally to localStorage so patient remembers their bookings
      try {
        const stored = JSON.parse(localStorage.getItem("clinicpilot_patient_bookings") || "[]");
        localStorage.setItem(
          "clinicpilot_patient_bookings",
          JSON.stringify([newApt, ...stored])
        );
      } catch (err) {
        console.error("Local storage error", err);
      }

      setConfirmedAppointment(newApt);
      onBookingSuccess(newApt);
      setStep(3);
    } catch (err: any) {
      setError(err?.message || "Failed to confirm appointment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (confirmedAppointment?.booking_code) {
      navigator.clipboard.writeText(confirmedAppointment.booking_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-surface-1 rounded-2xl border border-line shadow-card overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-surface-2/40">
          <div>
            <h2 className="text-base font-bold text-ink font-display">
              {step === 3 ? "Booking Confirmed" : "Book an Appointment"}
            </h2>
            <p className="text-xs text-ink-muted">
              {doctor.name} • {doctor.specialty}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-coral/10 border border-coral/20 text-coral text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: CONSULTATION TYPE & SLOT */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Consultation Type Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted font-display mb-2">
                  1. Select Consultation Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConsultationType("in_clinic")}
                    className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                      consultationType === "in_clinic"
                        ? "border-signal bg-signal/5 text-ink ring-1 ring-signal"
                        : "border-line bg-surface-1 hover:bg-surface-2 text-ink-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-2 font-bold text-xs text-ink">
                        <Building className="h-4 w-4 text-signal" />
                        In-Clinic Visit
                      </div>
                      <span className="text-xs font-bold font-display text-signal">
                        ₹{doctor.consultation_fee || 500}
                      </span>
                    </div>
                    <span className="text-[11px] text-ink-muted line-clamp-1">
                      {doctor.clinic_name}, {doctor.area}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConsultationType("video")}
                    className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                      consultationType === "video"
                        ? "border-signal bg-signal/5 text-ink ring-1 ring-signal"
                        : "border-line bg-surface-1 hover:bg-surface-2 text-ink-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-2 font-bold text-xs text-ink">
                        <Video className="h-4 w-4 text-signal" />
                        Online Video Consult
                      </div>
                      <span className="text-xs font-bold font-display text-signal">
                        ₹{doctor.video_fee || 400}
                      </span>
                    </div>
                    <span className="text-[11px] text-ink-muted line-clamp-1">
                      Via WhatsApp Video Link
                    </span>
                  </button>
                </div>
              </div>

              {/* Date Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted font-display mb-2">
                  2. Select Date
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {dateOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedDate(opt.value)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                        selectedDate === opt.value
                          ? "bg-signal text-white border-signal shadow-2xs"
                          : "border-line bg-surface-1 hover:bg-surface-2 text-ink"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slot Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted font-display mb-2">
                  3. Select Time Slot
                </label>

                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-ink-muted block mb-1.5">
                      Morning
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {MORNING_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 rounded-lg border text-xs font-semibold transition-all ${
                            selectedSlot === slot
                              ? "bg-signal text-white border-signal shadow-2xs font-bold"
                              : "border-line bg-surface-1 hover:bg-surface-2 text-ink"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-ink-muted block mb-1.5">
                      Afternoon
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {AFTERNOON_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 rounded-lg border text-xs font-semibold transition-all ${
                            selectedSlot === slot
                              ? "bg-signal text-white border-signal shadow-2xs font-bold"
                              : "border-line bg-surface-1 hover:bg-surface-2 text-ink"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-ink-muted block mb-1.5">
                      Evening
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {EVENING_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 rounded-lg border text-xs font-semibold transition-all ${
                            selectedSlot === slot
                              ? "bg-signal text-white border-signal shadow-2xs font-bold"
                              : "border-line bg-surface-1 hover:bg-surface-2 text-ink"
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleNextToDetails}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-signal text-white font-semibold text-xs hover:bg-signal-hover transition-colors shadow-sm"
                >
                  <span>Continue to Patient Details</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PATIENT DETAILS */}
          {step === 2 && (
            <form onSubmit={handleSubmitBooking} className="space-y-4">
              {/* Selected Slot Summary Ribbon */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-2 border border-line text-xs">
                <div>
                  <span className="font-semibold text-ink block">
                    {consultationType === "in_clinic" ? "🏥 In-Clinic" : "📹 Video Consult"} •{" "}
                    {selectedDate} at {selectedSlot}
                  </span>
                  <span className="text-ink-muted text-[11px]">
                    Doctor: {doctor.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleBackToSlots}
                  className="text-signal font-semibold text-xs hover:underline"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted font-display mb-1.5">
                  Patient Full Name <span className="text-coral">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-ink-faint" />
                  <input
                    type="text"
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Ramesh Verma"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-line bg-surface-1 focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted font-display mb-1.5">
                  Mobile Number (for WhatsApp Confirmation) <span className="text-coral">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-ink-faint" />
                  <input
                    type="tel"
                    required
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="e.g. 98200 12345"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-line bg-surface-1 focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal"
                  />
                </div>
                <p className="mt-1 text-[11px] text-ink-faint flex items-center gap-1">
                  <MessageSquare className="h-3 w-3 text-mint" />
                  Appointment pass & reminder will be dispatched instantly on WhatsApp.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted font-display mb-1.5">
                    Age
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="e.g. 34"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-line bg-surface-1 focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted font-display mb-1.5">
                    Gender
                  </label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-line bg-surface-1 focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted font-display mb-1.5">
                  Reason for Visit (Optional)
                </label>
                <textarea
                  rows={2}
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g. Routine dental checkup, consultation, or follow-up visit..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-line bg-surface-1 focus:outline-none focus:border-signal focus:ring-1 focus:ring-signal resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted font-display mb-1.5">
                  Attach Previous Clinic Report / File (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-line bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-ink cursor-pointer transition-colors">
                    <Paperclip className="h-3.5 w-3.5 text-signal" />
                    <span>Upload Report (PDF/Photo)</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setAttachedFileName(file.name);
                      }}
                    />
                  </label>
                  {attachedFileName && (
                    <span className="text-[11px] font-semibold text-mint truncate max-w-[200px]">
                      ✓ {attachedFileName}
                    </span>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleBackToSlots}
                  className="px-4 py-2.5 rounded-xl border border-line text-xs font-semibold text-ink hover:bg-surface-2 transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-signal text-white font-semibold text-xs hover:bg-signal-hover transition-colors disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span>Confirming Appointment...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm & Book Appointment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: BOOKING CONFIRMATION & DIGITAL PASS */}
          {step === 3 && confirmedAppointment && (
            <div className="text-center space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex flex-col items-center">
                <div className="h-16 w-16 rounded-full bg-mint/15 text-mint flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-10 w-10 text-mint" />
                </div>
                <h3 className="text-lg font-extrabold text-ink font-display">
                  Appointment Confirmed!
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Your appointment request has been scheduled with the clinic.
                </p>
              </div>

              {/* Digital Pass Card */}
              <div className="rounded-2xl border border-line bg-surface-2/60 p-4 text-left space-y-3">
                {/* Reference Code Header */}
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted font-display block">
                      Booking Reference &amp; Queue Token
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-signal font-display">
                        #{confirmedAppointment.booking_code}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-signal/10 text-signal font-bold text-xs font-display">
                        🎟️ Token #{confirmedAppointment.token_number || 1}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-line bg-surface-1 text-[11px] font-medium text-ink hover:bg-surface-2 transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copiedCode ? "Copied!" : "Copy"}</span>
                  </button>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Doctor:</span>
                    <span className="font-bold text-ink">{confirmedAppointment.doctor_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Clinic:</span>
                    <span className="font-semibold text-ink">{doctor.clinic_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Location:</span>
                    <span className="font-semibold text-ink">{doctor.area}, {doctor.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Date & Time:</span>
                    <span className="font-bold text-signal font-display">
                      {confirmedAppointment.date} at {confirmedAppointment.start_time}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Mode:</span>
                    <span className="font-semibold text-ink capitalize">
                      {confirmedAppointment.consultation_type === "video" ? "📹 Online Video" : "🏥 In-Clinic"}
                    </span>
                  </div>
                  {confirmedAppointment.attached_file_name && (
                    <div className="flex justify-between text-mint">
                      <span>Attached Report:</span>
                      <span className="font-semibold">{confirmedAppointment.attached_file_name}</span>
                    </div>
                  )}
                </div>

                {/* Live Queue Tracker on pass */}
                {confirmedAppointment.consultation_type !== "video" && (
                  <div className="pt-1">
                    <LiveQueueBadge tokenNumber={confirmedAppointment.token_number || 1} />
                  </div>
                )}

                {/* WhatsApp Alert */}
                <div className="pt-2 border-t border-line">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-mint/10 border border-mint/20 text-mint text-xs">
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="text-[11px] font-medium text-ink">
                      WhatsApp confirmation sent to <strong>{confirmedAppointment.patient_phone}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Close / Done */}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-signal text-white font-semibold text-xs hover:bg-signal-hover transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
