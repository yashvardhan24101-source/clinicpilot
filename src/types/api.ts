export type AppointmentStatus =
  | "booked"
  | "arrived"
  | "completed"
  | "no_show"
  | "cancelled";

export type AppointmentSource = "whatsapp" | "walkin" | "call" | "online";

export interface PrescriptionMedicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  notes?: string;
}

export interface Prescription {
  id: string;
  diagnosis: string;
  medicines: PrescriptionMedicine[];
  doctor_advice?: string;
  created_at: string;
}

export interface QueueState {
  current_token: number;
  total_waiting: number;
  avg_wait_minutes_per_patient: number;
  status: "active" | "paused";
}

export interface Appointment {
  id: string;
  clinic_id?: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  doctor_id: string;
  doctor_name: string;
  service_id: string;
  service_name: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  status: AppointmentStatus;
  source: AppointmentSource;
  consultation_type?: "in_clinic" | "video";
  patient_age?: number;
  patient_gender?: string;
  booking_code?: string;
  token_number?: number;
  estimated_wait_minutes?: number;
  prescription?: Prescription;
  attached_file_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: string;
  clinic_id?: string;
  name: string;
  specialty: string;
  qualifications?: string;
  experience_years?: number;
  rating?: number;
  review_count?: number;
  clinic_name?: string;
  area?: string;
  city?: string;
  consultation_fee?: number;
  video_fee?: number;
  treatments?: string[];
  next_available_slot?: string;
  about?: string;
  avatar_url?: string;
  color_tag: string;
  active: boolean;
  phone?: string;
}

export interface Service {
  id: string;
  clinic_id?: string;
  name: string;
  duration_minutes: number;
  price: number;
  category: string;
}

export interface Patient {
  id: string;
  clinic_id?: string;
  name: string;
  phone: string;
  language: "en" | "hi" | "hinglish";
  consent_status: {
    whatsapp_reminders: boolean;
    marketing: boolean;
  };
  last_visit?: string;
  total_visits: number;
  created_at: string;
}

export interface PatientProfile extends Patient {
  appointment_history: Appointment[];
}

export interface SendFollowUpsResponse {
  sent_count: number;
  message_category: "utility" | "marketing";
  cost_note: string;
}

export interface SnoozeFollowUpsResponse {
  snoozed_count: number;
  updated: FollowUp[];
}

export type ConversationState = "needs_staff" | "bot_handling" | "resolved";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender: "patient" | "bot" | "staff";
  content: string;
  timestamp: string;
  delivery_status: "sent" | "delivered" | "read" | "failed";
}

export interface Conversation {
  id: string;
  clinic_id?: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  state: ConversationState;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  messages: ChatMessage[];
}

export interface FollowUp {
  id: string;
  clinic_id?: string;
  patient_id: string;
  patient_name: string;
  patient_phone: string;
  service_name: string;
  last_visit_date: string;
  due_date: string;
  status: "due" | "sent" | "snoozed";
}

export interface DayCounts {
  total: number;
  booked: number;
  arrived: number;
  completed: number;
  no_show: number;
}

export interface LabReport {
  id: string;
  clinic_id?: string;
  patient_id: string;
  patient_name: string;
  title: string;
  category: "x_ray" | "blood_test" | "scan" | "prescription";
  file_name: string;
  file_size: string;
  uploaded_at: string;
  sent_to_whatsapp: boolean;
}

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
  features: string[];
  recommended?: boolean;
}
