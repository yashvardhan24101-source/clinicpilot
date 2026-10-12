import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PatientProfileSheet } from "@/components/patients/patient-profile-sheet";
import { AddPatientSheet } from "@/components/patients/add-patient-sheet";
import { PatientProfile } from "@/types/api";

const mockPatientProfile: PatientProfile = {
  id: "pat-test-1",
  name: "सुरेश वर्मा (Suresh Verma)",
  phone: "+91 98111 22233",
  language: "hi",
  consent_status: {
    whatsapp_reminders: true,
    marketing: false,
  },
  last_visit: "2026-10-10",
  total_visits: 4,
  created_at: "2026-01-15",
  appointment_history: [
    {
      id: "apt-h-1",
      patient_id: "pat-test-1",
      patient_name: "सुरेश वर्मा",
      patient_phone: "+91 98111 22233",
      doctor_id: "doc-1",
      doctor_name: "Dr. Ananya Sharma",
      service_id: "srv-1",
      service_name: "Dental Scaling & Polishing",
      date: "2026-10-10",
      start_time: "10:00",
      end_time: "10:30",
      status: "completed",
      source: "whatsapp",
      created_at: "2026-10-09T00:00:00Z",
      updated_at: "2026-10-10T10:30:00Z",
    },
  ],
};

describe("Patients & Follow-ups Components", () => {
  it("renders PatientProfileSheet with masked phone and toggles reveal", () => {
    render(
      <PatientProfileSheet
        patient={mockPatientProfile}
        isOpen={true}
        onClose={vi.fn()}
        onBookAppointment={vi.fn()}
        onDeletePatient={vi.fn()}
      />
    );

    expect(screen.getByText("सुरेश वर्मा (Suresh Verma)")).toBeInTheDocument();
    expect(screen.getByText("Dental Scaling & Polishing")).toBeInTheDocument();

    // Default phone should be masked
    expect(screen.getByText(/Reveal Phone/i)).toBeInTheDocument();

    // Tap to reveal
    const revealBtn = screen.getByText(/Reveal Phone/i);
    fireEvent.click(revealBtn);
    expect(screen.getByText("+91 98111 22233")).toBeInTheDocument();
  });

  it("renders consent status accurately", () => {
    render(
      <PatientProfileSheet
        patient={mockPatientProfile}
        isOpen={true}
        onClose={vi.fn()}
        onBookAppointment={vi.fn()}
        onDeletePatient={vi.fn()}
      />
    );

    expect(screen.getByText("Appointment Alerts")).toBeInTheDocument();
    expect(screen.getByText("Recalls & Promos")).toBeInTheDocument();
    expect(screen.getByText("Opted Out")).toBeInTheDocument();
  });

  it("submits AddPatientSheet correctly", () => {
    const onSubmit = vi.fn();
    render(
      <AddPatientSheet
        isOpen={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    const nameInput = screen.getByPlaceholderText(/ramesh chandra/i);
    fireEvent.change(nameInput, { target: { value: "Anita Desai" } });

    const submitBtn = screen.getByRole("button", { name: /add patient/i });
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Anita Desai",
        language: "en",
      })
    );
  });
});
