"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Clock, Stethoscope, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Appointment, Doctor } from "@/types/api";

interface RescheduleSheetProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  doctors: Doctor[];
  onConfirm: (id: string, updates: Partial<Appointment>) => void;
}

export const RescheduleSheet: React.FC<RescheduleSheetProps> = ({
  appointment,
  isOpen,
  onClose,
  doctors,
  onConfirm,
}) => {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [doctorId, setDoctorId] = useState("");

  useEffect(() => {
    if (appointment) {
      setDate(appointment.date);
      setStartTime(appointment.start_time);
      setDoctorId(appointment.doctor_id);
    }
  }, [appointment]);

  if (!appointment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const doc = doctors.find((d) => d.id === doctorId) || doctors[0];

    // Recalculate end time maintaining duration
    const [h, m] = startTime.split(":").map(Number);
    const [origStartH, origStartM] = appointment.start_time.split(":").map(Number);
    const [origEndH, origEndM] = appointment.end_time.split(":").map(Number);
    const durationMins = (origEndH * 60 + origEndM) - (origStartH * 60 + origStartM) || 30;

    const newEndMins = h * 60 + m + durationMins;
    const endH = Math.floor(newEndMins / 60) % 24;
    const endM = newEndMins % 60;
    const endTime = `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;

    onConfirm(appointment.id, {
      date,
      start_time: startTime,
      end_time: endTime,
      doctor_id: doc.id,
      doctor_name: doc.name,
      status: "booked", // reset status back to booked upon rescheduling
    });
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-w-md mx-auto">
        <SheetHeader>
          <SheetTitle>Reschedule Appointment</SheetTitle>
          <SheetDescription>
            Modify date, time, or doctor for {appointment.patient_name}.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
              New Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-ink-faint" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-9 font-display"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
              New Start Time
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-3.5 h-4 w-4 text-ink-faint" />
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="pl-9 font-display"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
              Doctor
            </label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="flex h-11 w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.specialty})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Check className="h-4 w-4" />
              <span>Confirm Reschedule</span>
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
