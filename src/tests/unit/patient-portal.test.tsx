import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DoctorCard } from "@/components/patient/doctor-card";
import { SymptomsStrip } from "@/components/patient/symptoms-strip";
import { PatientBookingModal } from "@/components/patient/patient-booking-modal";
import { MyAppointmentsDrawer } from "@/components/patient/my-appointments-drawer";
import { PortalRoleSelector } from "@/components/patient/portal-role-selector";
import { Doctor } from "@/types/api";
import { api } from "@/lib/api";

const mockDoctor: Doctor = {
  id: "doc-test-1",
  name: "Dr. Ananya Sharma",
  specialty: "Dentist / Endodontist",
  qualifications: "BDS, MDS - Endodontics",
  experience_years: 11,
  rating: 4.9,
  review_count: 320,
  clinic_name: "SmileCraft Dental & Implant Center",
  area: "Bandra West",
  city: "Mumbai",
  consultation_fee: 600,
  video_fee: 450,
  treatments: ["Toothache", "Root Canal Treatment", "Cavities"],
  next_available_slot: "Today at 04:30 PM",
  about: "Gold medalist endodontist specializing in painless single-sitting root canals.",
  color_tag: "#1F6FEB",
  active: true,
  phone: "+91 98110 12345",
};

describe("Patient Doctor Discovery & Online Booking", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("DoctorCard Component", () => {
    it("renders doctor credentials, clinic area, treatments, and fees", () => {
      const handleBook = vi.fn();
      render(<DoctorCard doctor={mockDoctor} onBook={handleBook} />);

      expect(screen.getByText("Dr. Ananya Sharma")).toBeInTheDocument();
      expect(screen.getByText("Dentist / Endodontist")).toBeInTheDocument();
      expect(screen.getByText(/SmileCraft Dental & Implant Center — Bandra West, Mumbai/i)).toBeInTheDocument();
      expect(screen.getByText("Toothache")).toBeInTheDocument();
      expect(screen.getByText("Root Canal Treatment")).toBeInTheDocument();
      expect(screen.getByText("₹600")).toBeInTheDocument();
      expect(screen.getByText("₹450")).toBeInTheDocument();
      expect(screen.getByText(/Next: Today at 04:30 PM/i)).toBeInTheDocument();
    });

    it("triggers onBook when Book Appointment button is clicked", () => {
      const handleBook = vi.fn();
      render(<DoctorCard doctor={mockDoctor} onBook={handleBook} />);

      const bookBtn = screen.getByRole("button", { name: /book appointment/i });
      fireEvent.click(bookBtn);

      expect(handleBook).toHaveBeenCalledWith(mockDoctor);
    });
  });

  describe("SymptomsStrip Component", () => {
    it("renders popular symptoms and triggers onSelectSpecialty when clicked", () => {
      const handleSelectSpecialty = vi.fn();
      render(
        <SymptomsStrip
          selectedSpecialty="all"
          onSelectSpecialty={handleSelectSpecialty}
        />
      );

      expect(screen.getByText("All Specialties")).toBeInTheDocument();
      expect(screen.getByText("Dentistry")).toBeInTheDocument();
      expect(screen.getByText("General Medicine")).toBeInTheDocument();
      expect(screen.getByText("Dermatology")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Dentistry"));
      expect(handleSelectSpecialty).toHaveBeenCalledWith("Dentist");
    });
  });

  describe("PatientBookingModal Component", () => {
    it("guides patient through booking flow: slot selection to patient details and confirmation", async () => {
      const handleClose = vi.fn();
      const handleSuccess = vi.fn();

      vi.spyOn(api, "createAppointment").mockResolvedValue({
        id: "apt-123",
        patient_id: "pat-123",
        patient_name: "Aarav Mehta",
        patient_phone: "+91 98765 43210",
        doctor_id: mockDoctor.id,
        doctor_name: mockDoctor.name,
        service_id: "srv-1",
        service_name: mockDoctor.specialty,
        date: "2026-10-15",
        start_time: "11:00",
        end_time: "11:30",
        status: "booked",
        source: "online",
        consultation_type: "in_clinic",
        booking_code: "CP-4491",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      render(
        <PatientBookingModal
          doctor={mockDoctor}
          isOpen={true}
          onClose={handleClose}
          onBookingSuccess={handleSuccess}
        />
      );

      // Step 1: Mode & Slot
      expect(screen.getByText("Book an Appointment")).toBeInTheDocument();
      expect(screen.getByText("1. Select Consultation Mode")).toBeInTheDocument();
      expect(screen.getByText("In-Clinic Visit")).toBeInTheDocument();

      // Proceed to Step 2
      const continueBtn = screen.getByRole("button", { name: /continue to patient details/i });
      fireEvent.click(continueBtn);

      // Step 2: Patient Form
      expect(screen.getByText(/Patient Full Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Mobile Number/i)).toBeInTheDocument();

      const nameInput = screen.getByPlaceholderText(/e\.g\. Ramesh Verma/i);
      const phoneInput = screen.getByPlaceholderText(/e\.g\. 98200 12345/i);

      fireEvent.change(nameInput, { target: { value: "Aarav Mehta" } });
      fireEvent.change(phoneInput, { target: { value: "9876543210" } });

      const submitBtn = screen.getByRole("button", { name: /confirm & book appointment/i });
      fireEvent.click(submitBtn);

      // Step 3: Confirmation
      await waitFor(() => {
        expect(screen.getByText("Appointment Confirmed!")).toBeInTheDocument();
      });

      expect(screen.getByText(/Booking Reference/i)).toBeInTheDocument();
      expect(screen.getByText(/CP-4491/i)).toBeInTheDocument();
      expect(screen.getByText(/WhatsApp confirmation sent/i)).toBeInTheDocument();
      expect(handleSuccess).toHaveBeenCalled();
    });
  });

  describe("MyAppointmentsDrawer Component", () => {
    it("renders booked appointments from localStorage", () => {
      const testAppointments = [
        {
          id: "apt-saved-1",
          patient_id: "pat-1",
          patient_name: "Aarav Mehta",
          patient_phone: "+91 98765 43210",
          doctor_id: "doc-test-1",
          doctor_name: "Dr. Ananya Sharma",
          service_id: "srv-1",
          service_name: "Dentist",
          date: "2026-10-15",
          start_time: "11:00",
          end_time: "11:30",
          status: "booked" as const,
          source: "online" as const,
          consultation_type: "in_clinic" as const,
          booking_code: "CP-4491",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];

      localStorage.setItem("clinicpilot_patient_bookings", JSON.stringify(testAppointments));

      render(
        <MyAppointmentsDrawer
          isOpen={true}
          onClose={vi.fn()}
          recentBookings={testAppointments}
        />
      );

      expect(screen.getByText("My Appointments")).toBeInTheDocument();
      expect(screen.getByText("Dr. Ananya Sharma")).toBeInTheDocument();
      expect(screen.getByText("#CP-4491")).toBeInTheDocument();
      expect(screen.getByText("In-Clinic Visit")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel appointment/i })).toBeInTheDocument();
    });
  });

  describe("PortalRoleSelector Component", () => {
    it("renders dual choices for Patient and Staff and triggers selection callbacks", () => {
      const handlePatient = vi.fn();
      const handleStaff = vi.fn();

      render(
        <PortalRoleSelector
          onSelectPatient={handlePatient}
          onSelectStaff={handleStaff}
        />
      );

      expect(screen.getByText("Welcome to ClinicPilot")).toBeInTheDocument();
      expect(screen.getByText("I am a Patient")).toBeInTheDocument();
      expect(screen.getByText("I am Clinic Staff / Doctor")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /enter patient portal/i }));
      expect(handlePatient).toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: /enter staff panel/i }));
      expect(handleStaff).toHaveBeenCalled();
    });
  });
});
