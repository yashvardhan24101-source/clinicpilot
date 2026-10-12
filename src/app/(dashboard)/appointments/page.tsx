"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  User,
  Phone,
  Stethoscope,
  MoreVertical,
  CheckCircle2,
  UserCheck,
  UserX,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/ui/status-pill";
import { Row } from "@/components/ui/row";
import { AppointmentDetailSheet } from "@/components/calendar/appointment-detail-sheet";
import { RescheduleSheet } from "@/components/calendar/reschedule-sheet";
import { api } from "@/lib/api";
import { formatTimeDisplay, formatDateDisplay, maskPhoneNumber } from "@/lib/utils";
import { Appointment, AppointmentStatus } from "@/types/api";

export default function AppointmentsListPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", selectedDoctor, selectedStatus],
    queryFn: () =>
      api.getAppointments({
        doctor_id: selectedDoctor,
        status: selectedStatus,
      }),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => api.getDoctors(),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppointmentStatus }) =>
      api.updateAppointmentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Appointment> }) =>
      api.createAppointment({ id, ...updates }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  // Filter appointments by search term
  const filteredAppointments = appointments.filter((apt) => {
    const q = search.toLowerCase();
    return (
      apt.patient_name.toLowerCase().includes(q) ||
      apt.patient_phone.includes(q) ||
      apt.service_name.toLowerCase().includes(q)
    );
  });

  // Export filtered appointments to CSV
  const handleExportCSV = () => {
    const headers = ["ID,Patient Name,Phone,Doctor,Service,Date,Start Time,End Time,Status,Source"];
    const rows = filteredAppointments.map((apt) =>
      [
        apt.id,
        `"${apt.patient_name}"`,
        apt.patient_phone,
        `"${apt.doctor_name}"`,
        `"${apt.service_name}"`,
        apt.date,
        apt.start_time,
        apt.end_time,
        apt.status,
        apt.source,
      ].join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `clinicpilot_appointments_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink font-display">
            Appointments Directory
          </h2>
          <p className="text-xs text-ink-soft">
            Search, filter, and export clinic appointment records
          </p>
        </div>

        <Button
          variant="outline"
          onClick={handleExportCSV}
          disabled={filteredAppointments.length === 0}
          className="gap-2 shadow-sm shrink-0"
        >
          <FileSpreadsheet className="h-4 w-4 text-ok" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-surface-1 rounded-2xl border border-line p-3 sm:p-4 shadow-subtle space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 h-4 w-4 text-ink-faint" />
            <Input
              placeholder="Search patient, phone, service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="flex h-11 w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <option value="all">All Doctors</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="flex h-11 w-full rounded-md border border-line bg-surface-1 px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <option value="all">All Statuses</option>
            <option value="booked">Booked</option>
            <option value="arrived">Arrived (In Clinic)</option>
            <option value="completed">Completed</option>
            <option value="no_show">No-Show</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-surface-1 rounded-2xl border border-line shadow-subtle overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line-subtle bg-surface-2/40 text-xs font-semibold text-ink-soft font-display">
          <span>Records ({filteredAppointments.length})</span>
          <span>Click row to view details</span>
        </div>

        <div className="divide-y divide-line-subtle">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-ink-soft">Loading appointments...</div>
          ) : filteredAppointments.length > 0 ? (
            filteredAppointments.map((apt) => (
              <Row
                key={apt.id}
                onClick={() => {
                  setSelectedAppointment(apt);
                  setIsDetailOpen(true);
                }}
                className="hover:bg-surface-2/60 cursor-pointer"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-20 shrink-0 pt-0.5">
                    <span className="font-display tabular-nums text-sm font-bold text-ink block">
                      {formatTimeDisplay(apt.start_time)}
                    </span>
                    <span className="text-[11px] text-ink-soft block font-display">
                      {formatDateDisplay(apt.date)}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-ink truncate font-devanagari">
                      {apt.patient_name}
                    </h4>
                    <p className="text-xs text-ink-soft truncate mt-0.5">
                      {apt.service_name} • {apt.doctor_name}
                    </p>
                    <p className="text-[11px] text-ink-faint mt-0.5">
                      {maskPhoneNumber(apt.patient_phone)} • via {apt.source}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <StatusPill status={apt.status} size="sm" />
                </div>
              </Row>
            ))
          ) : (
            <div className="p-12 text-center space-y-2">
              <p className="text-sm font-medium text-ink">No appointments match your filters.</p>
              <p className="text-xs text-ink-soft">Try adjusting search query or filters.</p>
            </div>
          )}
        </div>
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
    </div>
  );
}
