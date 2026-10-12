import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PrescriptionViewerModal } from "@/components/patient/prescription-viewer-modal";
import { Appointment } from "@/types/api";

const mockAppointmentWithRx: Appointment = {
  id: "apt-rx-1",
  patient_id: "pat-1",
  patient_name: "Aarav Mehta",
  patient_phone: "+91 98765 43210",
  doctor_id: "doc-1",
  doctor_name: "Dr. Ananya Sharma",
  service_id: "srv-1",
  service_name: "Dentist",
  date: "2026-10-12",
  start_time: "10:00",
  end_time: "10:30",
  status: "completed",
  source: "online",
  booking_code: "CP-4491",
  token_number: 2,
  prescription: {
    id: "rx-999",
    diagnosis: "Root Canal Post-Op Healing",
    medicines: [
      {
        name: "Amoxicillin 500mg",
        dosage: "500 mg",
        frequency: "1-0-1 (After Food)",
        duration: "5 Days",
        notes: "Take after meals",
      },
    ],
    doctor_advice: "Warm water rinses.",
    created_at: "2026-10-12T10:30:00Z",
  },
  created_at: "2026-10-12T10:00:00Z",
  updated_at: "2026-10-12T10:30:00Z",
};

describe("Option 3: Digital Prescription & Lab Downloader", () => {
  it("renders clinic letterhead, doctor credentials, and diagnosis", () => {
    render(
      <PrescriptionViewerModal
        isOpen={true}
        onClose={vi.fn()}
        appointment={mockAppointmentWithRx}
      />
    );

    expect(screen.getByText(/SmileCraft Dental & Healthcare Hub/i)).toBeInTheDocument();
    expect(screen.getAllByText("Dr. Ananya Sharma").length).toBeGreaterThan(0);
    expect(screen.getByText("Root Canal Post-Op Healing")).toBeInTheDocument();
    expect(screen.getByText("Amoxicillin 500mg")).toBeInTheDocument();
    expect(screen.getByText("Warm water rinses.")).toBeInTheDocument();
  });

  it("triggers print/save PDF dialog on button click", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    render(
      <PrescriptionViewerModal
        isOpen={true}
        onClose={vi.fn()}
        appointment={mockAppointmentWithRx}
      />
    );

    const printBtn = screen.getByRole("button", { name: /print \/ save pdf/i });
    fireEvent.click(printBtn);

    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });
});
