import {
  MOCK_APPOINTMENTS,
  MOCK_DOCTORS,
  MOCK_SERVICES,
  MOCK_PATIENTS,
  MOCK_CONVERSATIONS,
  MOCK_FOLLOWUPS,
  MOCK_LAB_REPORTS,
  MOCK_PLANS,
} from "@/mocks/seed-data";
import { Appointment, Conversation, ChatMessage, LabReport, Patient, QueueState, Prescription } from "@/types/api";
import { UserSession } from "@/types/auth";

// Initial sample prescription for demonstration
const SAMPLE_PRESCRIPTION: Prescription = {
  id: "rx-101",
  diagnosis: "Acute Dental Pulpitis & Gingival Inflammation",
  medicines: [
    {
      name: "Amoxicillin + Clavulanic Acid (Augmentin 625)",
      dosage: "625 mg",
      frequency: "1-0-1 (After Food)",
      duration: "5 Days",
      notes: "Take strictly after meals",
    },
    {
      name: "Aceclofenac + Paracetamol (Zerodol-P)",
      dosage: "100mg / 325mg",
      frequency: "1-0-1 (SOS Pain)",
      duration: "3 Days",
      notes: "For acute pain relief",
    },
    {
      name: "Chlorhexidine Mouthwash 0.2% (Hexidine)",
      dosage: "10 ml",
      frequency: "Twice daily",
      duration: "7 Days",
      notes: "Gargle for 30 seconds after brushing",
    },
  ],
  doctor_advice: "Avoid chewing hard foods on the left side. Warm salt water rinses 3 times a day. Return in 5 days for final crown seating.",
  created_at: new Date().toISOString(),
};

// Seed token numbers and prescriptions into initial appointments
const seededAppointments: Appointment[] = MOCK_APPOINTMENTS.map((apt, idx) => ({
  ...apt,
  token_number: idx + 1,
  estimated_wait_minutes: Math.max(0, (idx + 1 - 3) * 15),
  prescription: apt.status === "completed" ? SAMPLE_PRESCRIPTION : undefined,
}));

// Global singleton in-memory state for Next.js server
declare global {
  // eslint-disable-next-line no-var
  var __clinicpilot_store__:
    | {
        appointments: Appointment[];
        conversations: Conversation[];
        patients: Patient[];
        followups: typeof MOCK_FOLLOWUPS;
        reports: LabReport[];
        currentUser: UserSession | null;
        queueState: QueueState;
      }
    | undefined;
}

if (!global.__clinicpilot_store__) {
  global.__clinicpilot_store__ = {
    appointments: seededAppointments,
    conversations: [...MOCK_CONVERSATIONS],
    patients: [...MOCK_PATIENTS],
    followups: [...MOCK_FOLLOWUPS],
    reports: [...MOCK_LAB_REPORTS],
    queueState: {
      current_token: 3,
      total_waiting: 4,
      avg_wait_minutes_per_patient: 15,
      status: "active",
    },
    currentUser: {
      id: "usr-1",
      name: "Priya Sharma (Reception)",
      email: "reception@smilecraft.in",
      role: "receptionist",
      clinic_id: "cln-1",
      clinic_name: "SmileCraft Dental Clinic",
    },
  };
}

export const serverStore = global.__clinicpilot_store__;
