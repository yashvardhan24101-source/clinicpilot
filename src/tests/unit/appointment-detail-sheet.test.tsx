import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AppointmentDetailSheet } from "@/components/calendar/appointment-detail-sheet";
import { Appointment } from "@/types/api";

const mockAppointment: Appointment = {
  id: "apt-test-1",
  patient_id: "pat-1",
  patient_name: "Rajesh Kumar",
  patient_phone: "+91 98765 43210",
  doctor_id: "doc-1",
  doctor_name: "Dr. Ananya Sharma",
  service_id: "srv-3",
  service_name: "Root Canal Treatment",
  date: "2026-10-12",
  start_time: "10:00",
  end_time: "10:45",
  status: "booked",
  source: "whatsapp",
  notes: "Urgent root canal sitting",
  created_at: "2026-10-12T09:00:00Z",
  updated_at: "2026-10-12T09:00:00Z",
};

describe("AppointmentDetailSheet Component", () => {
  it("renders appointment details correctly when open", () => {
    render(
      <AppointmentDetailSheet
        appointment={mockAppointment}
        isOpen={true}
        onClose={vi.fn()}
        onStatusChange={vi.fn()}
        onOpenReschedule={vi.fn()}
      />
    );

    expect(screen.getByText("Appointment Details")).toBeInTheDocument();
    expect(screen.getByText("Rajesh Kumar")).toBeInTheDocument();
    expect(screen.getByText("Dr. Ananya Sharma")).toBeInTheDocument();
    expect(screen.getByText("Root Canal Treatment")).toBeInTheDocument();
    expect(screen.getByText(/Urgent root canal sitting/)).toBeInTheDocument();
  });

  it("renders action buttons (Mark Arrived, Reschedule)", () => {
    render(
      <AppointmentDetailSheet
        appointment={mockAppointment}
        isOpen={true}
        onClose={vi.fn()}
        onStatusChange={vi.fn()}
        onOpenReschedule={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: /mark arrived/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reschedule/i })).toBeInTheDocument();
  });
});
