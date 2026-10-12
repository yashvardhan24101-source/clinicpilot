import {
  Appointment,
  AppointmentStatus,
  Doctor,
  Service,
  Conversation,
  ChatMessage,
  Patient,
  PatientProfile,
  FollowUp,
  SendFollowUpsResponse,
  SnoozeFollowUpsResponse,
  LabReport,
  BillingPlan,
  QueueState,
} from "@/types/api";
import { UserSession, LoginCredentials, AuthResponse } from "@/types/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "Unknown error");
    throw new ApiError(res.status, errorText || `HTTP error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Appointments
  getAppointments: (params?: { doctor_id?: string; status?: string; date?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.doctor_id && params.doctor_id !== "all") searchParams.set("doctor_id", params.doctor_id);
    if (params?.status && params.status !== "all") searchParams.set("status", params.status);
    if (params?.date) searchParams.set("date", params.date);

    const qs = searchParams.toString();
    return request<Appointment[]>(`/appointments${qs ? `?${qs}` : ""}`);
  },

  updateAppointmentStatus: (id: string, status: AppointmentStatus) => {
    return request<Appointment>(`/appointments/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  createAppointment: (data: Partial<Appointment>) => {
    return request<Appointment>("/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Doctors & Services
  getDoctors: (params?: { city?: string; specialty?: string; q?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.city && params.city !== "all") searchParams.set("city", params.city);
    if (params?.specialty && params.specialty !== "all") searchParams.set("specialty", params.specialty);
    if (params?.q) searchParams.set("q", params.q);
    const qs = searchParams.toString();
    return request<Doctor[]>(`/doctors${qs ? `?${qs}` : ""}`);
  },
  getServices: () => request<Service[]>("/services"),

  // Live Queue & Tokens
  getQueue: () => request<QueueState>("/queue"),
  updateQueue: (data: Partial<QueueState>) =>
    request<QueueState>("/queue", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Conversations
  getConversations: (state?: string) => {
    const qs = state && state !== "all" ? `?state=${state}` : "";
    return request<Conversation[]>(`/conversations${qs}`);
  },

  getConversation: (id: string) => {
    return request<Conversation>(`/conversations/${id}`);
  },

  getConversationMessages: (id: string) => {
    return request<ChatMessage[]>(`/conversations/${id}/messages`);
  },

  replyConversation: (id: string, message: string) => {
    return request<ChatMessage>(`/conversations/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  },

  handbackConversation: (id: string) => {
    return request<{ status: string; conversation: Conversation }>(`/conversations/${id}/handback`, {
      method: "POST",
    });
  },

  // Patients
  getPatients: (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<Patient[]>(`/patients${qs}`);
  },

  getPatient: (id: string) => {
    return request<PatientProfile>(`/patients/${id}`);
  },

  createPatient: (data: Partial<Patient>) => {
    return request<Patient>("/patients", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  deletePatient: (id: string) => {
    return request<{ status: string; id: string }>(`/patients/${id}`, {
      method: "DELETE",
    });
  },

  // Follow-ups
  getFollowUps: () => request<FollowUp[]>("/followups/due"),

  sendFollowUps: (ids: string[]) => {
    return request<SendFollowUpsResponse>("/followups/send", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  snoozeFollowUps: (ids: string[], days: number) => {
    return request<SnoozeFollowUpsResponse>("/followups/snooze", {
      method: "POST",
      body: JSON.stringify({ ids, days }),
    });
  },

  // Lab Reports & PDFs
  getReports: () => request<LabReport[]>("/reports"),

  createReport: (data: Partial<LabReport>) => {
    return request<LabReport>("/reports", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  sendReportToWhatsApp: (id: string) => {
    return request<{ status: string; report_id: string; message: string }>(
      `/reports/${id}/send-whatsapp`,
      { method: "POST" }
    );
  },

  // Razorpay Billing & Plans
  getBillingPlans: () => {
    return request<{ plans: BillingPlan[]; subscription: any }>("/billing/plans");
  },

  subscribePlan: (plan_id: string) => {
    return request<{ status: string; razorpay_payment_id: string; subscription: any }>(
      "/billing/subscribe",
      {
        method: "POST",
        body: JSON.stringify({ plan_id }),
      }
    );
  },

  // Super Admin Area
  getAdminMetrics: () => request<any>("/admin/metrics"),

  // Health
  getHealth: () => request<{ status: string; service: string }>("/health"),

  // Auth
  login: (credentials: LoginCredentials) => {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  logout: () => {
    return request<{ message: string }>("/auth/logout", {
      method: "POST",
    });
  },

  getMe: () => request<UserSession>("/auth/me"),

  forgotPassword: (email: string) => {
    return request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
};
