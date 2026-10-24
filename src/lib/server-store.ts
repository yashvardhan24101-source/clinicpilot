import {
  MOCK_APPOINTMENTS,
  MOCK_DOCTORS,
  MOCK_SERVICES,
  MOCK_PATIENTS,
  MOCK_CONVERSATIONS,
  MOCK_FOLLOWUPS,
  MOCK_LAB_REPORTS,
} from "@/mocks/seed-data";
import {
  Appointment,
  Conversation,
  Doctor,
  Service,
  LabReport,
  Patient,
  QueueState,
  Prescription,
  FollowUp,
} from "@/types/api";
import { getClinicTodayIST } from "@/lib/date-helpers";

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

// Seed appointments tagged with clinic_id
const seededAppointments: Appointment[] = [
  ...MOCK_APPOINTMENTS.map((apt, idx) => ({
    ...apt,
    clinic_id: apt.clinic_id || "cln-1",
    token_number: idx + 1,
    estimated_wait_minutes: Math.max(0, (idx + 1 - 3) * 15),
    prescription: apt.status === "completed" ? SAMPLE_PRESCRIPTION : undefined,
  })),
  // Multi-tenant isolation seed: appointments for Apex Dental Clinic (cln-2)
  {
    id: "apt-apex-1",
    clinic_id: "cln-2",
    patient_id: "pat-apex-1",
    patient_name: "Rohan Varma",
    patient_phone: "+91 99887 76655",
    doctor_id: "doc-apex-1",
    doctor_name: "Dr. K. S. Rao",
    service_id: "srv-apex-1",
    service_name: "Orthodontic Consultation",
    date: getClinicTodayIST(),
    start_time: "14:00",
    end_time: "14:30",
    status: "booked",
    source: "whatsapp",
    notes: "Consultation at Apex Dental Clinic",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Seed patients tagged with clinic_id
const seededPatients: Patient[] = [
  ...MOCK_PATIENTS.map((p) => ({
    ...p,
    clinic_id: p.clinic_id || "cln-1",
  })),
  {
    id: "pat-apex-1",
    clinic_id: "cln-2",
    name: "Rohan Varma",
    phone: "+91 99887 76655",
    language: "en",
    consent_status: { whatsapp_reminders: true, marketing: false },
    total_visits: 1,
    created_at: "2026-10-10T10:00:00Z",
  },
];

// Seed conversations tagged with clinic_id
const seededConversations: Conversation[] = [
  ...MOCK_CONVERSATIONS.map((c) => ({
    ...c,
    clinic_id: c.clinic_id || "cln-1",
  })),
  {
    id: "conv-apex-1",
    clinic_id: "cln-2",
    patient_id: "pat-apex-1",
    patient_name: "Rohan Varma",
    patient_phone: "+91 99887 76655",
    state: "bot_handling",
    last_message: "Hello Apex Diagnostics, what is the cost of an OPG scan?",
    last_message_time: "10 mins ago",
    unread_count: 0,
    messages: [
      {
        id: "msg-apex-1",
        conversation_id: "conv-apex-1",
        sender: "patient",
        content: "Hello Apex Diagnostics, what is the cost of an OPG scan?",
        timestamp: new Date().toISOString(),
        delivery_status: "read",
      },
      {
        id: "msg-apex-2",
        conversation_id: "conv-apex-1",
        sender: "bot",
        content: "Hi Rohan! A digital OPG scan at Apex Diagnostics is ₹950. Would you like to schedule an appointment?",
        timestamp: new Date().toISOString(),
        delivery_status: "delivered",
      },
    ],
  },
];

// Seed follow-ups tagged with clinic_id
const seededFollowups: FollowUp[] = [
  ...MOCK_FOLLOWUPS.map((f) => ({
    ...f,
    clinic_id: f.clinic_id || "cln-1",
  })),
  {
    id: "fol-apex-1",
    clinic_id: "cln-2",
    patient_id: "pat-apex-1",
    patient_name: "Rohan Varma",
    patient_phone: "+91 99887 76655",
    service_name: "Orthodontic Aligners Review",
    last_visit_date: "2026-10-01",
    due_date: "2026-10-15",
    status: "due",
  },
];

// Seed lab reports tagged with clinic_id
const seededReports: LabReport[] = [
  ...MOCK_LAB_REPORTS.map((r) => ({
    ...r,
    clinic_id: r.clinic_id || "cln-1",
  })),
  {
    id: "rep-apex-1",
    clinic_id: "cln-2",
    patient_id: "pat-apex-1",
    patient_name: "Rohan Varma",
    title: "Apex Full OPG Scan",
    category: "x_ray",
    file_name: "apex-scan.pdf",
    file_size: "1.8 MB",
    uploaded_at: "2026-10-12T11:00:00Z",
    sent_to_whatsapp: false,
  },
];

// Seed doctors tagged with clinic_id
const seededDoctors: Doctor[] = [
  ...MOCK_DOCTORS.map((d) => ({
    ...d,
    clinic_id: d.clinic_id || "cln-1",
  })),
  {
    id: "doc-apex-1",
    clinic_id: "cln-2",
    name: "Dr. K. S. Rao",
    specialty: "Orthodontics & Dentofacial Orthopedics",
    clinic_name: "Apex Diagnostics",
    color_tag: "#1F6FEB",
    active: true,
  },
];

// Seed services tagged with clinic_id
const seededServices: Service[] = [
  ...MOCK_SERVICES.map((s) => ({
    ...s,
    clinic_id: s.clinic_id || "cln-1",
  })),
  {
    id: "srv-apex-1",
    clinic_id: "cln-2",
    name: "Digital OPG Scan",
    duration_minutes: 20,
    price: 950,
    category: "Radiology",
  },
];

// Global singleton in-memory state for Next.js server (shared data cache)
// Per security rules: NO global currentUser! User identity is derived per-request from verified JWT cookie.
declare global {
  // eslint-disable-next-line no-var
  var __clinicpilot_store__:
    | {
        appointments: Appointment[];
        conversations: Conversation[];
        patients: Patient[];
        followups: FollowUp[];
        reports: LabReport[];
        doctors: Doctor[];
        services: Service[];
        queueState: QueueState;
      }
    | undefined;
}

if (!global.__clinicpilot_store__) {
  global.__clinicpilot_store__ = {
    appointments: seededAppointments,
    conversations: seededConversations,
    patients: seededPatients,
    followups: seededFollowups,
    reports: seededReports,
    doctors: seededDoctors,
    services: seededServices,
    queueState: {
      current_token: 3,
      total_waiting: 4,
      avg_wait_minutes_per_patient: 15,
      status: "active",
    },
  };
}

export const serverStore = global.__clinicpilot_store__;
