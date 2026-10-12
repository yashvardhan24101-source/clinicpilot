"use client";

import React from "react";
import { Doctor } from "@/types/api";
import {
  Star,
  MapPin,
  Clock,
  Video,
  Building,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface DoctorCardProps {
  doctor: Doctor;
  onBook: (doctor: Doctor) => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onBook }) => {
  // Extract initials
  const initials = doctor.name
    .replace(/^Dr\.\s*/i, "")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="group relative rounded-2xl border border-line bg-surface-1 p-5 sm:p-6 shadow-2xs hover:shadow-card hover:border-signal/30 transition-all flex flex-col justify-between">
      {/* Top Section: Avatar, Info, Badges */}
      <div>
        <div className="flex items-start gap-4">
          {/* Avatar with Specialty Color Tag Accent */}
          <div className="relative shrink-0">
            <div
              className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl font-display font-extrabold text-lg text-white shadow-sm ring-2 ring-surface-1"
              style={{ backgroundColor: doctor.color_tag || "#1F6FEB" }}
            >
              {initials}
            </div>
            <div
              className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface-1 border border-line text-mint shadow-2xs"
              title="Verified Doctor"
            >
              <CheckCircle2 className="h-3.5 w-3.5 fill-mint text-white" />
            </div>
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-base sm:text-lg font-bold text-ink font-display truncate">
                {doctor.name}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber/10 text-amber-600 text-[11px] font-bold">
                <Star className="h-3 w-3 fill-amber text-amber" />
                {doctor.rating || 4.9}
                <span className="text-ink-muted font-normal">
                  ({doctor.review_count || 120})
                </span>
              </span>
            </div>

            <p className="text-xs font-semibold text-signal mb-0.5">
              {doctor.specialty}
            </p>

            <p className="text-xs text-ink-muted line-clamp-1 mb-1.5">
              {doctor.qualifications} • {doctor.experience_years} years experience
            </p>

            {/* Clinic and Area */}
            <div className="flex items-center gap-1.5 text-xs text-ink-muted">
              <MapPin className="h-3.5 w-3.5 text-signal shrink-0" />
              <span className="truncate font-medium">
                {doctor.clinic_name} — {doctor.area}, {doctor.city}
              </span>
            </div>
          </div>
        </div>

        {/* About snippet */}
        {doctor.about && (
          <p className="mt-3 text-xs text-ink-muted line-clamp-2 leading-relaxed bg-surface-2/40 rounded-xl p-2.5 border border-line/60">
            {doctor.about}
          </p>
        )}

        {/* Treatments / Causes tags */}
        {doctor.treatments && doctor.treatments.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {doctor.treatments.slice(0, 4).map((treatment, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded-lg bg-surface-2 text-ink-muted text-[11px] font-medium border border-line"
              >
                {treatment}
              </span>
            ))}
            {doctor.treatments.length > 4 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-lg bg-surface-2 text-ink-faint text-[10px] font-medium">
                +{doctor.treatments.length - 4} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Section: Availability, Fees, & CTA */}
      <div className="mt-5 pt-4 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Next slot and fees */}
        <div className="space-y-1">
          {doctor.next_available_slot && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-mint bg-mint/10 px-2 py-0.5 rounded-md">
              <Clock className="h-3.5 w-3.5 text-mint shrink-0" />
              <span>Next: {doctor.next_available_slot}</span>
            </div>
          )}

          <div className="flex items-center gap-3 text-xs text-ink-muted font-medium">
            <span className="flex items-center gap-1">
              <Building className="h-3.5 w-3.5 text-ink-faint" />
              Clinic:{" "}
              <strong className="text-ink font-display">
                ₹{doctor.consultation_fee || 500}
              </strong>
            </span>
            {doctor.video_fee && (
              <span className="flex items-center gap-1">
                <Video className="h-3.5 w-3.5 text-signal" />
                Video:{" "}
                <strong className="text-ink font-display">
                  ₹{doctor.video_fee}
                </strong>
              </span>
            )}
          </div>
        </div>

        {/* Book Button */}
        <button
          onClick={() => onBook(doctor)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-signal text-white font-semibold text-xs hover:bg-signal-hover active:scale-[0.98] transition-all shadow-sm group-hover:shadow-md"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span>Book Appointment</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};
