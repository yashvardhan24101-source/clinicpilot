"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Plus,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Appointment, AppointmentStatus } from "@/types/api";
import { getClinicTodayIST } from "@/lib/date-helpers";

const AppointmentDetailSheet = dynamic(
  () => import("@/components/calendar/appointment-detail-sheet").then((m) => m.AppointmentDetailSheet),
  { ssr: false }
);
const RescheduleSheet = dynamic(
  () => import("@/components/calendar/reschedule-sheet").then((m) => m.RescheduleSheet),
  { ssr: false }
);
const QuickBookSheet = dynamic(
  () => import("@/components/today/quick-book-sheet").then((m) => m.QuickBookSheet),
  { ssr: false }
);

// Dynamically import the CalendarView client wrapper
const CalendarView = dynamic(
  () => import("@/components/calendar/calendar-view"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex items-center justify-center bg-surface-1 rounded-2xl border border-line">
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <Clock className="h-4 w-4 animate-spin text-signal" />
          <span>Loading Clinic Calendar...</span>
        </div>
      </div>
    ),
  }
);

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createSlotTime, setCreateSlotTime] = useState<string>("10:00");

  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", selectedDoctor],
    queryFn: () =>
      api.getAppointments({
        doctor_id: selectedDoctor,
      }),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => api.getDoctors(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.getServices(),
  });

  // Status Mutation
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      api.updateAppointmentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  // Reschedule Mutation
  const rescheduleMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Appointment> }) =>
      api.createAppointment({ id, ...updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  // Create Appointment Mutation
  const createMutation = useMutation({
    mutationFn: (newApt: Partial<Appointment>) => api.createAppointment(newApt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  // Transform appointments into FullCalendar events format
  const calendarEvents = appointments.map((apt) => {
    let bgColor = "#1F6FEB";
    let borderColor = "#1250B5";
    let textColor = "#ffffff";

    if (apt.status === "completed") {
      bgColor = "#14B87A";
      borderColor = "#0E8357";
    } else if (apt.status === "arrived") {
      bgColor = "#F2A31B";
      borderColor = "#BA7609";
    } else if (apt.status === "no_show" || apt.status === "cancelled") {
      bgColor = "#E5484D";
      borderColor = "#BA2B30";
    }

    return {
      id: apt.id,
      title: `${apt.patient_name} (${apt.service_name})`,
      start: `${apt.date}T${apt.start_time}:00`,
      end: `${apt.date}T${apt.end_time || apt.start_time}:00`,
      backgroundColor: bgColor,
      borderColor: borderColor,
      textColor: textColor,
      extendedProps: {
        appointment: apt,
      },
    };
  });

  const handleEventClick = (info: any) => {
    const apt = info.event.extendedProps.appointment as Appointment;
    setSelectedAppointment(apt);
    setIsDetailOpen(true);
  };

  const handleDateSelect = (selectInfo: any) => {
    const timeStr = selectInfo.startStr.includes("T")
      ? selectInfo.startStr.split("T")[1].substring(0, 5)
      : "10:00";
    setCreateSlotTime(timeStr);
    setIsCreateOpen(true);
  };

  const handleEventDrop = (dropInfo: any) => {
    const apt = dropInfo.event.extendedProps.appointment as Appointment;
    const newStart = dropInfo.event.start;
    const newDate = getClinicTodayIST(newStart);
    const newTime = newStart.toTimeString().substring(0, 5);

    statusMutation.mutate({
      id: apt.id,
      status: apt.status,
    });
    api.createAppointment({
      id: apt.id,
      date: newDate,
      start_time: newTime,
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-ink-soft text-xs font-semibold uppercase tracking-wider font-display">
            <CalendarDays className="h-3.5 w-3.5 text-signal" />
            <span>Interactive Scheduling</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink font-display mt-0.5">
            Clinic Calendar Grid
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="default"
            onClick={() => {
              setCreateSlotTime("11:00");
              setIsCreateOpen(true);
            }}
            className="gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Booking</span>
          </Button>
        </div>
      </div>

      {/* Doctor Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setSelectedDoctor("all")}
          className={`px-3.5 py-2 min-h-[44px] inline-flex items-center rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
            selectedDoctor === "all"
              ? "bg-signal text-white border-signal shadow-sm"
              : "bg-surface-1 text-ink-soft border-line hover:bg-surface-2"
          }`}
        >
          All Doctors ({appointments.length})
        </button>

        {doctors.map((doc) => {
          const isSelected = selectedDoctor === doc.id;
          return (
            <button
              key={doc.id}
              onClick={() => setSelectedDoctor(doc.id)}
              className={`px-3.5 py-2 min-h-[44px] inline-flex items-center rounded-full text-xs font-semibold whitespace-nowrap transition-colors border gap-1.5 ${
                isSelected
                  ? "bg-signal text-white border-signal shadow-sm"
                  : "bg-surface-1 text-ink-soft border-line hover:bg-surface-2"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: doc.color_tag }}
              />
              <span>{doc.name}</span>
            </button>
          );
        })}
      </div>

      {/* Calendar Card Container */}
      <div className="bg-surface-1 rounded-2xl border border-line p-3 sm:p-5 shadow-subtle">
        <CalendarView
          events={calendarEvents}
          onEventClick={handleEventClick}
          onSelect={handleDateSelect}
          onEventDrop={handleEventDrop}
        />
      </div>

      {/* Appointment Detail Sheet */}
      <AppointmentDetailSheet
        appointment={selectedAppointment}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
        onOpenReschedule={(apt) => {
          setSelectedAppointment(apt);
          setIsRescheduleOpen(true);
        }}
      />

      {/* Reschedule Sheet */}
      <RescheduleSheet
        appointment={selectedAppointment}
        isOpen={isRescheduleOpen}
        onClose={() => setIsRescheduleOpen(false)}
        doctors={doctors}
        onConfirm={(id, updates) => rescheduleMutation.mutate({ id, updates })}
      />

      {/* Quick Booking Sheet Modal */}
      <QuickBookSheet
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        defaultTime={createSlotTime}
        doctors={doctors}
        services={services}
        onSubmit={(newApt) => createMutation.mutate(newApt)}
      />
    </div>
  );
}
