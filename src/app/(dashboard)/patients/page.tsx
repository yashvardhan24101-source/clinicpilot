"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Users,
  ShieldCheck,
  Eye,
  EyeOff,
  Plus,
  Calendar,
  MessageSquare,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { Input } from "@/components/ui/input";
import { Row } from "@/components/ui/row";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { maskPhoneNumber, formatDateDisplay } from "@/lib/utils";
import { Patient, PatientProfile, Doctor, Service, Appointment } from "@/types/api";

const PatientProfileSheet = dynamic(
  () => import("@/components/patients/patient-profile-sheet").then((m) => m.PatientProfileSheet),
  { ssr: false }
);
const AddPatientSheet = dynamic(
  () => import("@/components/patients/add-patient-sheet").then((m) => m.AddPatientSheet),
  { ssr: false }
);
const QuickBookSheet = dynamic(
  () => import("@/components/today/quick-book-sheet").then((m) => m.QuickBookSheet),
  { ssr: false }
);

export default function PatientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({});
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isQuickBookOpen, setIsQuickBookOpen] = useState(false);
  const [prefilledPatient, setPrefilledPatient] = useState<PatientProfile | null>(null);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ["patients", search],
    queryFn: () => api.getPatients(search),
  });

  const { data: selectedProfile } = useQuery({
    queryKey: ["patient-profile", selectedPatientId],
    queryFn: () => (selectedPatientId ? api.getPatient(selectedPatientId) : null),
    enabled: Boolean(selectedPatientId),
  });

  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors"],
    queryFn: () => api.getDoctors(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: () => api.getServices(),
  });

  // Create Patient Mutation
  const createPatientMutation = useMutation({
    mutationFn: (data: Partial<Patient>) => api.createPatient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  // Delete Patient Mutation
  const deletePatientMutation = useMutation({
    mutationFn: (id: string) => api.deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  // Create Appointment Mutation
  const createAppointmentMutation = useMutation({
    mutationFn: (data: Partial<Appointment>) => api.createAppointment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      if (selectedPatientId) {
        queryClient.invalidateQueries({ queryKey: ["patient-profile", selectedPatientId] });
      }
    },
  });

  const toggleReveal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedPhones((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePatientClick = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setIsProfileOpen(true);
  };

  const handleBookForPatient = (patient: PatientProfile) => {
    setPrefilledPatient(patient);
    setIsQuickBookOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink font-display">
            Patients Directory
          </h2>
          <p className="text-xs text-ink-soft">
            Search records, WhatsApp consent &amp; treatment history
          </p>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          className="gap-2 shadow-sm shrink-0"
          size="default"
        >
          <Plus className="h-4 w-4" />
          <span>Add Patient</span>
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-ink-faint" />
        <Input
          placeholder="Search by patient name or phone number..."
          aria-label="Search by patient name or phone number"
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Patients List */}
      <div className="bg-surface-1 rounded-2xl border border-line shadow-subtle overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line-subtle bg-surface-2/30 text-xs font-semibold text-ink-soft font-display">
          <span>Active Patients ({patients.length})</span>
          <span>Tap row to view full profile &amp; visits</span>
        </div>

        <div className="divide-y divide-line-subtle">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : patients.length > 0 ? (
            patients.map((patient) => {
              const isRevealed = Boolean(revealedPhones[patient.id]);

              return (
                <Row
                  key={patient.id}
                  onClick={() => handlePatientClick(patient)}
                  className="cursor-pointer hover:bg-surface-2/60 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-signal-subtle text-signal font-bold font-display text-sm">
                      {patient.name.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-ink truncate font-devanagari">
                          {patient.name}
                        </h3>
                        <span className="px-1.5 py-0.2 rounded-md bg-surface-2 text-[10px] font-semibold text-ink-soft uppercase font-display">
                          {patient.language}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="font-display text-ink-soft">
                          {isRevealed ? patient.phone : maskPhoneNumber(patient.phone)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => toggleReveal(patient.id, e)}
                          aria-label={isRevealed ? `Hide phone for ${patient.name}` : `Reveal phone for ${patient.name}`}
                          className="text-ink-soft hover:text-signal min-h-[44px] min-w-[44px] inline-flex items-center justify-center p-1 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-signal"
                          title={isRevealed ? "Hide phone" : "Reveal phone"}
                        >
                          {isRevealed ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      <p className="text-[11px] text-ink-faint mt-0.5">
                        {patient.total_visits} visit{patient.total_visits !== 1 ? "s" : ""} • Last seen{" "}
                        {patient.last_visit ? formatDateDisplay(patient.last_visit) : "Never"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {patient.consent_status.whatsapp_reminders && (
                      <span
                        className="flex items-center gap-1 text-[11px] text-ok bg-ok-subtle px-2 py-0.5 rounded-full font-semibold border border-ok/20"
                        title="WhatsApp Consent Active"
                      >
                        <ShieldCheck className="h-3 w-3" />
                        <span className="hidden sm:inline">WhatsApp Verified</span>
                      </span>
                    )}
                  </div>
                </Row>
              );
            })
          ) : (
            <div className="p-12 text-center space-y-2">
              <Users className="h-8 w-8 text-ink-faint mx-auto" />
              <p className="text-sm font-medium text-ink">No patients found.</p>
              <p className="text-xs text-ink-soft">
                Try searching a different name or tap &ldquo;Add Patient&rdquo;.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Patient Profile Sheet */}
      <PatientProfileSheet
        patient={selectedProfile || null}
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onBookAppointment={handleBookForPatient}
        onDeletePatient={(id) => deletePatientMutation.mutate(id)}
      />

      {/* Add Patient Sheet */}
      <AddPatientSheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmit={(data) => createPatientMutation.mutate(data)}
      />

      {/* Quick Booking Sheet */}
      <QuickBookSheet
        isOpen={isQuickBookOpen}
        onClose={() => setIsQuickBookOpen(false)}
        defaultTime="11:00"
        doctors={doctors}
        services={services}
        onSubmit={(aptData) =>
          createAppointmentMutation.mutate({
            ...aptData,
            patient_id: prefilledPatient?.id,
            patient_name: prefilledPatient?.name || aptData.patient_name,
            patient_phone: prefilledPatient?.phone || aptData.patient_phone,
          })
        }
      />
    </div>
  );
}
