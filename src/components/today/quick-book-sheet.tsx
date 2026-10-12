"use client";

import React, { useState } from "react";
import { Plus, X, User, Phone, Stethoscope, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Doctor, Service, Appointment } from "@/types/api";

interface QuickBookSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTime?: string;
  doctors: Doctor[];
  services: Service[];
  onSubmit: (data: Partial<Appointment>) => void;
}

export const QuickBookSheet: React.FC<QuickBookSheetProps> = ({
  isOpen,
  onClose,
  defaultTime = "11:00",
  doctors,
  services,
  onSubmit,
}) => {
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("+91 ");
  const [selectedDoctorId, setSelectedDoctorId] = useState(doctors[0]?.id || "");
  const [selectedServiceId, setSelectedServiceId] = useState(services[0]?.id || "");
  const [time, setTime] = useState(defaultTime);
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) return;

    const doctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];
    const service = services.find((s) => s.id === selectedServiceId) || services[0];

    // calculate end_time based on service duration
    const [hours, mins] = time.split(":").map(Number);
    const startMinutes = hours * 60 + mins;
    const endMinutes = startMinutes + (service?.duration_minutes || 30);
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    const endTime = `${String(endHours).padStart(2, "0")}:${String(endMins).padStart(2, "0")}`;

    onSubmit({
      patient_name: patientName.trim(),
      patient_phone: patientPhone.trim(),
      doctor_id: doctor.id,
      doctor_name: doctor.name,
      service_id: service.id,
      service_name: service.name,
      start_time: time,
      end_time: endTime,
      status: "booked",
      source: "walkin",
      notes: notes.trim(),
      date: new Date().toISOString().split("T")[0],
    });

    // Reset and close
    setPatientName("");
    setPatientPhone("+91 ");
    setNotes("");
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="max-w-lg mx-auto">
        <SheetHeader>
          <SheetTitle>New Walk-in / Booking</SheetTitle>
          <SheetDescription>
            Quickly add an appointment to today&apos;s schedule rail.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
              Patient Name (English or Hindi)
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 h-4 w-4 text-ink-faint" />
              <Input
                placeholder="e.g. Rajesh Kumar or सुनीता देवी"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 h-4 w-4 text-ink-faint" />
                <Input
                  placeholder="+91 98765 43210"
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  className="pl-9 font-display"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
                Time Slot
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-3.5 h-4 w-4 text-ink-faint" />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-9 font-display"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
              Assigned Doctor
            </label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="flex h-11 w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} ({doc.specialty})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
              Service
            </label>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(e.target.value)}
              className="flex h-11 w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              {services.map((srv) => (
                <option key={srv.id} value={srv.id}>
                  {srv.name} ({srv.duration_minutes}m • ₹{srv.price})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink-soft uppercase tracking-wider font-display">
              Optional Notes
            </label>
            <Input
              placeholder="e.g. Tooth sensitivity, urgent walk-in"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="pt-2 flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Confirm Booking</span>
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};
