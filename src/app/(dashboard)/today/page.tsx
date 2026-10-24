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
  WifiOff,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeRail } from "@/components/today/time-rail";
import { QuickBookSheet } from "@/components/today/quick-book-sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatClinicDateDisplay, getClinicTodayIST, getClinicTimeDisplayIST } from "@/lib/date-helpers";
import { Appointment, AppointmentStatus } from "@/types/api";
import { useAuth } from "@/lib/auth-context";
import { saveTodaySnapshot, getTodaySnapshot } from "@/lib/offline-snapshot";

export default function TodayPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isQuickBookOpen, setIsQuickBookOpen] = useState(false);
  const [quickBookDefaultTime, setQuickBookDefaultTime] = useState<string>("11:00");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Network offline status and last synced timestamp
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => getClinicTimeDisplayIST());
  const [snapshotAppointments, setSnapshotAppointments] = useState<Appointment[] | null>(null);

  // Strictly use IST date helper; no toISOString().split("T")[0]
  const todayStr = getClinicTodayIST();

  // Listen to browser online / offline state
  useEffect(() => {
    const handleOnlineEvent = () => setIsOnline(true);
    const handleOfflineEvent = () => setIsOnline(false);

    window.addEventListener("online", handleOnlineEvent);
    window.addEventListener("offline", handleOfflineEvent);

    return () => {
      window.removeEventListener("online", handleOnlineEvent);
      window.removeEventListener("offline", handleOfflineEvent);
    };
  }, []);

  // Fetch appointments for today with 10-second polling for live reception updates
  const {
    data: liveAppointments = [],
    isLoading,
    isError,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["appointments", selectedDoctor, statusFilter, todayStr],
    queryFn: async () => {
      const data = await api.getAppointments({
        doctor_id: selectedDoctor,
        status: statusFilter,
        date: todayStr,
      });
      const syncTime = getClinicTimeDisplayIST();
      setLastSyncedTime(syncTime);

      // Save minimal snapshot in IndexedDB
      const activeUserId = user?.user_id || user?.id;
      if (user?.clinic_id && activeUserId) {
        saveTodaySnapshot(user.clinic_id, activeUserId, todayStr, data, syncTime).catch(() => {});
      }

      return data;
    },
    refetchInterval: 10000,
  });

  // When offline or in error, load minimal snapshot from IndexedDB
  useEffect(() => {
    const activeUserId = user?.user_id || user?.id;
    if ((!isOnline || isError) && user?.clinic_id && activeUserId) {
      getTodaySnapshot(user.clinic_id, activeUserId, todayStr).then((snapshot) => {
        if (snapshot && snapshot.appointments.length > 0) {
          const mapped: Appointment[] = snapshot.appointments.map((a) => ({
            id: a.id,
            clinic_id: snapshot.clinic_id,
            patient_id: `offline-${a.id}`,
            patient_name: a.patient_name_or_initials,
            patient_phone: "", // Strictly never stored
            doctor_id: "doc-1",
            doctor_name: a.doctor,
            service_id: "srv-1",
            service_name: a.service,
            date: snapshot.date,
            start_time: a.time,
            end_time: a.time,
            status: a.status,
            source: "walkin",
            created_at: snapshot.synced_at,
            updated_at: snapshot.synced_at,
          }));
          setSnapshotAppointments(mapped);
          if (snapshot.synced_time_display) {
            setLastSyncedTime(snapshot.synced_time_display);
          }
        }
      });
    } else if (isOnline && !isError) {
      setSnapshotAppointments(null);
    }
  }, [isOnline, isError, user?.clinic_id, user?.user_id, user?.id, todayStr]);

  // Use snapshot when offline/error and snapshot exists
  const appointments = (!isOnline || isError) && snapshotAppointments ? snapshotAppointments : liveAppointments;

  // Update last synced time on query data refresh
  useEffect(() => {
    if (dataUpdatedAt) {
      setLastSyncedTime(getClinicTimeDisplayIST(new Date(dataUpdatedAt)));
    }
  }, [dataUpdatedAt]);

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => api.getDoctors(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.getServices(),
  });

  // Mutation for Appointment Status Updates (disabled when offline)
  const statusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: AppointmentStatus }) => {
      if (!isOnline) {
        throw new Error("You are offline. Actions are unavailable until you reconnect.");
      }
      return api.updateAppointmentStatus(id, newStatus);
    },
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: ["appointments"] });

      const previousAppointments = queryClient.getQueryData<Appointment[]>([
        "appointments",
        selectedDoctor,
        statusFilter,
        todayStr,
      ]);

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
    mutationFn: (newApt: Partial<Appointment>) => {
      if (!isOnline) {
        throw new Error("You are offline. Actions are unavailable until you reconnect.");
      }
      return api.createAppointment(newApt);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });

  const handleStatusChange = (id: string, newStatus: AppointmentStatus) => {
    if (!isOnline) {
      alert("You're offline. Actions are unavailable until you reconnect.");
      return;
    }
    statusMutation.mutate({ id, newStatus });
  };

  const handleOpenQuickBook = (slotTime?: string) => {
    if (!isOnline) {
      alert("You're offline. Actions are unavailable until you reconnect.");
      return;
    }
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

  // Metrics calculation: exactly matching the appointment list
  const totalBooked = appointments.filter((a) => a.status === "booked").length;
  const totalArrived = appointments.filter((a) => a.status === "arrived").length;
  const totalCompleted = appointments.filter((a) => a.status === "completed").length;
  const totalNoShow = appointments.filter((a) => a.status === "no_show").length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-5">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div
          data-testid="offline-banner"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              You&apos;re offline. Showing the schedule from {lastSyncedTime}. Actions are unavailable until you reconnect.
            </span>
          </div>
          <span className="text-[11px] text-amber-800 shrink-0 font-medium">
            Last synced: {lastSyncedTime}
          </span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-ink-soft text-xs font-semibold uppercase tracking-wider font-display">
            <Calendar className="h-3.5 w-3.5 text-signal" />
            <span data-testid="today-date-display">{formatClinicDateDisplay(todayStr)}</span>
            <button
              onClick={handleManualRefresh}
              aria-label="Refresh schedule"
              title="Refresh schedule"
              className="ml-1 text-ink-soft hover:text-signal transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-signal"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-signal" : ""}`} />
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

      {/* Metric Counters: Skeletons shown during isLoading (NEVER flash 0) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Booked */}
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
          {isLoading ? (
            <Skeleton data-testid="counter-skeleton" className="mt-1 h-7 w-12 rounded-md" />
          ) : (
            <div data-testid="count-booked" className="mt-1 text-2xl font-bold font-display tabular-nums text-ink">
              {totalBooked}
            </div>
          )}
        </div>

        {/* In Clinic (Arrived) */}
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
          {isLoading ? (
            <Skeleton data-testid="counter-skeleton" className="mt-1 h-7 w-12 rounded-md" />
          ) : (
            <div data-testid="count-arrived" className="mt-1 text-2xl font-bold font-display tabular-nums text-ink">
              {totalArrived}
            </div>
          )}
        </div>

        {/* Completed */}
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
          {isLoading ? (
            <Skeleton data-testid="counter-skeleton" className="mt-1 h-7 w-12 rounded-md" />
          ) : (
            <div data-testid="count-completed" className="mt-1 text-2xl font-bold font-display tabular-nums text-ink">
              {totalCompleted}
            </div>
          )}
        </div>

        {/* No-Show */}
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
          {isLoading ? (
            <Skeleton data-testid="counter-skeleton" className="mt-1 h-7 w-12 rounded-md" />
          ) : (
            <div data-testid="count-no-show" className="mt-1 text-2xl font-bold font-display tabular-nums text-ink">
              {totalNoShow}
            </div>
          )}
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

      {/* THE LIVE TIME RAIL CONTAINER */}
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

        {/* 1. ERROR STATE CARD */}
        {isError ? (
          <div
            data-testid="error-card"
            className="py-10 px-4 text-center rounded-xl bg-alert-subtle/40 border border-alert/30 space-y-3"
          >
            <div className="w-10 h-10 rounded-full bg-alert-subtle mx-auto flex items-center justify-center text-alert">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink font-display">
                Unable to load today&apos;s schedule
              </p>
              <p className="text-xs text-ink-soft mt-1">
                Please check your network connection or try refreshing.
              </p>
            </div>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="gap-2 border-line hover:bg-surface-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Try again</span>
            </Button>
          </div>
        ) : isLoading ? (
          /* 2. LOADING STATE SKELETONS */
          <div data-testid="rail-loading-skeleton" className="space-y-4 py-4">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : appointments.length > 0 ? (
          /* 3. POPULATED STATE TIME RAIL */
          <TimeRail
            appointments={appointments}
            onStatusChange={handleStatusChange}
            onOpenQuickBook={handleOpenQuickBook}
            selectedDoctor={selectedDoctor}
            isToday={true}
          />
        ) : (
          /* 4. EMPTY STATE CARD */
          <div data-testid="empty-schedule-card" className="py-12 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-signal-subtle mx-auto flex items-center justify-center text-signal">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink font-display">
                No appointments today. Tap an open slot to book one.
              </p>
              <p className="text-xs text-ink-soft mt-1">
                Bookings made via WhatsApp or walk-in will appear on this schedule automatically.
              </p>
            </div>
            <Button
              onClick={() => handleOpenQuickBook()}
              size="sm"
              className="gap-1.5 shadow-sm mt-1"
            >
              <Plus className="h-4 w-4" />
              <span>New appointment</span>
            </Button>
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
