"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  RefreshCw,
  Clock,
  UserCheck,
  CheckCircle2,
  UserX,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeRail } from "@/components/today/time-rail";
import { QuickBookSheet } from "@/components/today/quick-book-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatDateDisplay } from "@/lib/utils";
import { Appointment, AppointmentStatus } from "@/types/api";
import { offlineQueue } from "@/lib/offline-queue";

export default function TodayPage() {
  const queryClient = useQueryClient();
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isQuickBookOpen, setIsQuickBookOpen] = useState(false);
  const [quickBookDefaultTime, setQuickBookDefaultTime] = useState<string>("11:00");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  // Fetch appointments with 10-second polling for live reception updates
  const {
    data: appointments = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["appointments", selectedDoctor, statusFilter, todayStr],
    queryFn: () =>
      api.getAppointments({
        doctor_id: selectedDoctor,
        status: statusFilter,
        date: todayStr,
      }),
    refetchInterval: 10000,
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => api.getDoctors(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.getServices(),
  });

  // Background sync handler for offline queue flush
  useEffect(() => {
    const handleOnline = async () => {
      const pendingQueue = offlineQueue.getQueue();
      if (pendingQueue.length === 0) return;

      for (const item of pendingQueue) {
        try {
          await api.updateAppointmentStatus(item.appointment_id, item.status);
          offlineQueue.remove(item.id);
        } catch (e) {
          console.error("Failed to sync queued action", e);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [queryClient]);

  // Optimistic Mutation for Appointment Status Updates
  const statusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: AppointmentStatus }) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        offlineQueue.enqueue(id, newStatus);
        return { id, status: newStatus };
      }
      return api.updateAppointmentStatus(id, newStatus);
    },
    onMutate: async ({ id, newStatus }) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ["appointments"] });

      // Snapshot previous value
      const previousAppointments = queryClient.getQueryData<Appointment[]>([
        "appointments",
        selectedDoctor,
        statusFilter,
        todayStr,
      ]);

      // Optimistically update cache
      if (previousAppointments) {
        queryClient.setQueryData<Appointment[]>(
          ["appointments", selectedDoctor, statusFilter, todayStr],
          previousAppointments.map((apt) =>
            apt.id === id ? { ...apt, status: newStatus } : apt
          )
        );
      }

      return { previousAppointments };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousAppointments) {
        queryClient.setQueryData(
          ["appointments", selectedDoctor, statusFilter, todayStr],
          context.previousAppointments
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  // Mutation for creating a new appointment
  const createMutation = useMutation({
    mutationFn: (newApt: Partial<Appointment>) => api.createAppointment(newApt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  const handleStatusChange = (id: string, newStatus: AppointmentStatus) => {
    statusMutation.mutate({ id, newStatus });
  };

  const handleOpenQuickBook = (slotTime?: string) => {
    if (slotTime) {
      setQuickBookDefaultTime(slotTime);
    }
    setIsQuickBookOpen(true);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Metrics calculation
  const totalBooked = appointments.filter((a) => a.status === "booked").length;
  const totalArrived = appointments.filter((a) => a.status === "arrived").length;
  const totalCompleted = appointments.filter((a) => a.status === "completed").length;
  const totalNoShow = appointments.filter((a) => a.status === "no_show").length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-ink-soft text-xs font-semibold uppercase tracking-wider font-display">
            <Calendar className="h-3.5 w-3.5 text-signal" />
            <span>{formatDateDisplay(todayStr)}</span>
            <button
              onClick={handleManualRefresh}
              className="ml-1 text-ink-faint hover:text-signal transition-colors p-1"
              title="Refresh schedule"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin text-signal" : ""}`} />
            </button>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink font-display mt-0.5">
            Today&apos;s Clinic Schedule
          </h2>
        </div>

        <Button
          onClick={() => handleOpenQuickBook()}
          className="shrink-0 gap-2 shadow-sm"
          size="default"
        >
          <Plus className="h-4 w-4" />
          <span>New Appointment</span>
        </Button>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div
          onClick={() => setStatusFilter(statusFilter === "booked" ? "all" : "booked")}
          className={`cursor-pointer rounded-xl p-3 border transition-all ${
            statusFilter === "booked"
              ? "bg-warn-subtle/80 border-warn shadow-sm"
              : "bg-surface-1 border-line hover:border-warn/40"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span className="font-medium">Booked</span>
            <Clock className="h-3.5 w-3.5 text-warn" />
          </div>
          <div className="mt-1 text-2xl font-bold font-display tabular-nums text-ink">
            {totalBooked}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "arrived" ? "all" : "arrived")}
          className={`cursor-pointer rounded-xl p-3 border transition-all ${
            statusFilter === "arrived"
              ? "bg-ok-subtle/80 border-ok shadow-sm"
              : "bg-surface-1 border-line hover:border-ok/40"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span className="font-medium">In Clinic (Arrived)</span>
            <UserCheck className="h-3.5 w-3.5 text-ok" />
          </div>
          <div className="mt-1 text-2xl font-bold font-display tabular-nums text-ink">
            {totalArrived}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "completed" ? "all" : "completed")}
          className={`cursor-pointer rounded-xl p-3 border transition-all ${
            statusFilter === "completed"
              ? "bg-ok-subtle/80 border-ok shadow-sm"
              : "bg-surface-1 border-line hover:border-ok/40"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span className="font-medium">Completed</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-ok" />
          </div>
          <div className="mt-1 text-2xl font-bold font-display tabular-nums text-ink">
            {totalCompleted}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === "no_show" ? "all" : "no_show")}
          className={`cursor-pointer rounded-xl p-3 border transition-all ${
            statusFilter === "no_show"
              ? "bg-alert-subtle/80 border-alert shadow-sm"
              : "bg-surface-1 border-line hover:border-alert/40"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-ink-soft">
            <span className="font-medium">No-Show</span>
            <UserX className="h-3.5 w-3.5 text-alert" />
          </div>
          <div className="mt-1 text-2xl font-bold font-display tabular-nums text-ink">
            {totalNoShow}
          </div>
        </div>
      </div>

      {/* Doctor Filter Pill Strip */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setSelectedDoctor("all")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
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
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border flex items-center gap-1.5 ${
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

      {/* THE LIVE TIME RAIL */}
      <div className="bg-surface-1 rounded-2xl border border-line shadow-subtle p-4 sm:p-6 overflow-hidden">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-line-subtle">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-signal" />
            <h3 className="text-sm font-semibold text-ink font-display">
              Live Vertical Time Rail
            </h3>
          </div>
          <span className="text-xs text-ink-soft">
            {appointments.length} appointments on schedule
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : appointments.length > 0 ? (
          <TimeRail
            appointments={appointments}
            onStatusChange={handleStatusChange}
            onOpenQuickBook={handleOpenQuickBook}
          />
        ) : (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-ink">No appointments found.</p>
            <p className="text-xs text-ink-soft">
              Tap &ldquo;New Appointment&rdquo; to add a booking.
            </p>
          </div>
        )}
      </div>

      {/* Quick Booking Sheet Modal */}
      <QuickBookSheet
        isOpen={isQuickBookOpen}
        onClose={() => setIsQuickBookOpen(false)}
        defaultTime={quickBookDefaultTime}
        doctors={doctors}
        services={services}
        onSubmit={(newApt) => createMutation.mutate(newApt)}
      />
    </div>
  );
}
