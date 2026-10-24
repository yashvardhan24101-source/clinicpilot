import { http, HttpResponse } from "msw";
import {
  MOCK_APPOINTMENTS,
  MOCK_DOCTORS,
  MOCK_SERVICES,
  MOCK_PATIENTS,
  MOCK_CONVERSATIONS,
  MOCK_FOLLOWUPS,
  MOCK_LAB_REPORTS,
  MOCK_PLANS,
} from "../seed-data";
import { Appointment, Conversation, ChatMessage, LabReport } from "@/types/api";
import { UserSession } from "@/types/auth";
import { getClinicTodayIST, getRelativeDateIST } from "@/lib/date-helpers";

// In-memory state for dev and testing
let appointments: Appointment[] = [...MOCK_APPOINTMENTS];
let conversations: Conversation[] = [...MOCK_CONVERSATIONS];
let patients = [...MOCK_PATIENTS];
let followups = [...MOCK_FOLLOWUPS];
let reports: LabReport[] = [...MOCK_LAB_REPORTS];
let currentSubscription = {
  plan_id: "plan-growth",
  plan_name: "Growth Practice",
  status: "active",
  renews_at: "2026-11-12",
};
let currentUser: UserSession | null = {
  id: "usr-1",
  name: "Priya Sharma (Reception)",
  email: "reception@smilecraft.in",
  role: "receptionist",
  clinic_id: "cln-1",
  clinic_name: "SmileCraft Dental Clinic",
};

export const handlers = [
  // Health
  http.get("/api/health", () => {
    return HttpResponse.json({ status: "ok", service: "ClinicPilot Mock API", time: new Date().toISOString() });
  }),

  // Auth
  http.post("/api/auth/login", async ({ request }) => {
    const { email, password } = (await request.json()) as { email: string; password?: string };

    if (!email || !password) {
      return new HttpResponse("Email and password are required", { status: 400 });
    }

    // Role simulation based on email
    let role: "receptionist" | "doctor" | "owner" | "super_admin" = "receptionist";
    let name = "Priya (Reception)";

    if (email.includes("superadmin")) {
      role = "super_admin";
      name = "System Super Admin";
    } else if (email.includes("doctor") || email.includes("sharma")) {
      role = "doctor";
      name = "Dr. Ananya Sharma";
    } else if (email.includes("owner")) {
      role = "owner";
      name = "Dr. Vikram Patel (Owner)";
    }

    currentUser = {
      id: `usr-${Date.now()}`,
      name,
      email,
      role,
      clinic_id: "cln-1",
      clinic_name: "SmileCraft Dental Clinic",
    };

    return HttpResponse.json(
      {
        user: currentUser,
        token: `mock-jwt-token-${Date.now()}`,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
      {
        headers: {
          "Set-Cookie": `clinicpilot_session=${currentUser.id}; Path=/; HttpOnly; SameSite=Lax`,
        },
      }
    );
  }),

  http.post("/api/auth/logout", () => {
    currentUser = null;
    return HttpResponse.json({ message: "Successfully logged out" });
  }),

  http.get("/api/auth/me", () => {
    if (!currentUser) {
      return new HttpResponse("Unauthorized", { status: 401 });
    }
    return HttpResponse.json(currentUser);
  }),

  http.post("/api/auth/forgot-password", () => {
    return HttpResponse.json({
      message: "Reset instructions have been sent to your clinic email address.",
    });
  }),

  // Doctors
  http.get("/api/doctors", ({ request }) => {
    const url = new URL(request.url);
    const city = url.searchParams.get("city");
    const specialty = url.searchParams.get("specialty");
    const query = url.searchParams.get("q")?.toLowerCase();

    let result = [...MOCK_DOCTORS];

    if (city && city !== "all") {
      result = result.filter((d) => d.city?.toLowerCase() === city.toLowerCase());
    }

    if (specialty && specialty !== "all") {
      result = result.filter((d) =>
        d.specialty.toLowerCase().includes(specialty.toLowerCase())
      );
    }

    if (query) {
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.specialty.toLowerCase().includes(query) ||
          d.clinic_name?.toLowerCase().includes(query) ||
          d.area?.toLowerCase().includes(query) ||
          d.treatments?.some((t) => t.toLowerCase().includes(query))
      );
    }

    return HttpResponse.json(result);
  }),

  // Services
  http.get("/api/services", () => {
    return HttpResponse.json(MOCK_SERVICES);
  }),

  // Appointments
  http.get("/api/appointments", ({ request }) => {
    const url = new URL(request.url);
    const doctorId = url.searchParams.get("doctor_id");
    const status = url.searchParams.get("status");

    let result = [...appointments];

    if (doctorId && doctorId !== "all") {
      result = result.filter((a) => a.doctor_id === doctorId);
    }

    if (status && status !== "all") {
      result = result.filter((a) => a.status === status);
    }

    return HttpResponse.json(result);
  }),

  http.patch("/api/appointments/:id", async ({ params, request }) => {
    const { id } = params;
    const updates = (await request.json()) as Partial<Appointment>;

    const index = appointments.findIndex((a) => a.id === id);
    if (index === -1) {
      return new HttpResponse("Appointment not found", { status: 404 });
    }

    appointments[index] = {
      ...appointments[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    return HttpResponse.json(appointments[index]);
  }),

  http.post("/api/appointments", async ({ request }) => {
    const body = (await request.json()) as Partial<Appointment>;
    const bookingCode = body.booking_code || `CP-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAppointment: Appointment = {
      id: `apt-${Date.now()}`,
      patient_id: body.patient_id || `pat-${Date.now()}`,
      patient_name: body.patient_name || "Online Patient",
      patient_phone: body.patient_phone || "+91 99999 00000",
      doctor_id: body.doctor_id || MOCK_DOCTORS[0].id,
      doctor_name: body.doctor_name || MOCK_DOCTORS[0].name,
      service_id: body.service_id || MOCK_SERVICES[0].id,
      service_name: body.service_name || "General Consultation",
      date: body.date || getClinicTodayIST(),
      start_time: body.start_time || "11:00",
      end_time: body.end_time || "11:30",
      status: body.status || "booked",
      source: body.source || "online",
      consultation_type: body.consultation_type || "in_clinic",
      patient_age: body.patient_age,
      patient_gender: body.patient_gender,
      booking_code: bookingCode,
      notes: body.notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    appointments.unshift(newAppointment);

    // Also simulate creating an active WhatsApp booking record so it links to the clinic inbox
    const convId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: convId,
      patient_id: newAppointment.patient_id,
      patient_name: newAppointment.patient_name,
      patient_phone: newAppointment.patient_phone,
      state: "bot_handling",
      last_message: `Your appointment with ${newAppointment.doctor_name} on ${newAppointment.date} at ${newAppointment.start_time} is confirmed! (Ref: #${bookingCode})`,
      last_message_time: "Just now",
      unread_count: 0,
      messages: [
        {
          id: `msg-${Date.now()}-1`,
          conversation_id: convId,
          sender: "patient",
          content: `Hi, I booked an appointment for ${newAppointment.service_name} with ${newAppointment.doctor_name}.`,
          timestamp: "Just now",
          delivery_status: "read",
        },
        {
          id: `msg-${Date.now()}-2`,
          conversation_id: convId,
          sender: "bot",
          content: `Namaste ${newAppointment.patient_name}! Your booking #${bookingCode} with ${newAppointment.doctor_name} is confirmed for ${newAppointment.date} at ${newAppointment.start_time}. We look forward to seeing you.`,
          timestamp: "Just now",
          delivery_status: "delivered",
        },
      ],
    };
    conversations.unshift(newConv);

    return HttpResponse.json(newAppointment, { status: 201 });
  }),

  // Conversations (Inbox)
  http.get("/api/conversations", ({ request }) => {
    const url = new URL(request.url);
    const state = url.searchParams.get("state");

    let result = [...conversations];
    if (state && state !== "all") {
      result = result.filter((c) => c.state === state);
    }

    return HttpResponse.json(result);
  }),

  http.get("/api/conversations/:id", ({ params }) => {
    const { id } = params;
    const conversation = conversations.find((c) => c.id === id);
    if (!conversation) {
      return new HttpResponse("Conversation not found", { status: 404 });
    }
    return HttpResponse.json(conversation);
  }),

  http.get("/api/conversations/:id/messages", ({ params }) => {
    const { id } = params;
    const conversation = conversations.find((c) => c.id === id);
    if (!conversation) {
      return new HttpResponse("Conversation not found", { status: 404 });
    }
    return HttpResponse.json(conversation.messages);
  }),

  http.post("/api/conversations/:id/reply", async ({ params, request }) => {
    const { id } = params;
    const { message } = (await request.json()) as { message: string };

    const convIndex = conversations.findIndex((c) => c.id === id);
    if (convIndex === -1) {
      return new HttpResponse("Conversation not found", { status: 404 });
    }

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversation_id: id as string,
      sender: "staff",
      content: message,
      timestamp: "Just now",
      delivery_status: "sent",
    };

    conversations[convIndex].messages.push(newMsg);
    conversations[convIndex].last_message = message;
    conversations[convIndex].last_message_time = "Just now";

    return HttpResponse.json(newMsg, { status: 201 });
  }),

  http.post("/api/conversations/:id/handback", ({ params }) => {
    const { id } = params;
    const convIndex = conversations.findIndex((c) => c.id === id);
    if (convIndex === -1) {
      return new HttpResponse("Conversation not found", { status: 404 });
    }

    conversations[convIndex].state = "bot_handling";
    const systemNotice: ChatMessage = {
      id: `msg-${Date.now()}`,
      conversation_id: id as string,
      sender: "bot",
      content: "Staff handed this conversation back to ClinicPilot Assistant.",
      timestamp: "Just now",
      delivery_status: "delivered",
    };
    conversations[convIndex].messages.push(systemNotice);

    return HttpResponse.json({ status: "handed_back", conversation: conversations[convIndex] });
  }),

  // Patients
  http.get("/api/patients", ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.toLowerCase();

    let result = [...patients];
    if (search) {
      result = result.filter(
        (p) => p.name.toLowerCase().includes(search) || p.phone.includes(search)
      );
    }
    return HttpResponse.json(result);
  }),

  http.get("/api/patients/:id", ({ params }) => {
    const { id } = params;
    const patient = patients.find((p) => p.id === id);
    if (!patient) {
      return new HttpResponse("Patient not found", { status: 404 });
    }

    const patientAppointments = appointments.filter((a) => a.patient_id === id);
    return HttpResponse.json({
      ...patient,
      appointment_history: patientAppointments,
    });
  }),

  http.post("/api/patients", async ({ request }) => {
    const body = (await request.json()) as any;
    const newPatient = {
      id: `pat-${Date.now()}`,
      name: body.name || "New Patient",
      phone: body.phone || "+91 98000 00000",
      language: body.language || "en",
      consent_status: body.consent_status || {
        whatsapp_reminders: true,
        marketing: false,
      },
      last_visit: getClinicTodayIST(),
      total_visits: 1,
      created_at: getClinicTodayIST(),
    };
    patients.unshift(newPatient);
    return HttpResponse.json(newPatient, { status: 201 });
  }),

  http.delete("/api/patients/:id", ({ params }) => {
    const { id } = params;
    const idx = patients.findIndex((p) => p.id === id);
    if (idx === -1) {
      return new HttpResponse("Patient not found", { status: 404 });
    }
    patients.splice(idx, 1);
    return HttpResponse.json({ status: "deleted", id });
  }),

  // Follow-ups
  http.get("/api/followups/due", () => {
    return HttpResponse.json(followups);
  }),

  http.post("/api/followups/send", async ({ request }) => {
    const { ids } = (await request.json()) as { ids: string[] };
    followups = followups.map((f) =>
      ids.includes(f.id) ? { ...f, status: "sent" as const } : f
    );
    return HttpResponse.json({
      sent_count: ids.length,
      message_category: "utility",
      cost_note: "₹0.80 per WhatsApp message via Meta Cloud API",
    });
  }),

  http.post("/api/followups/snooze", async ({ request }) => {
    const { ids, days } = (await request.json()) as { ids: string[]; days: number };
    followups = followups.map((f) => {
      if (ids.includes(f.id)) {
        const targetDueDate = getRelativeDateIST(days || 7, f.due_date);
        return {
          ...f,
          due_date: targetDueDate,
          status: "snoozed" as const,
        };
      }
      return f;
    });

    const updated = followups.filter((f) => ids.includes(f.id));
    return HttpResponse.json({
      snoozed_count: ids.length,
      updated,
    });
  }),

  // Lab Reports & PDFs
  http.get("/api/reports", () => {
    return HttpResponse.json(reports);
  }),

  http.post("/api/reports", async ({ request }) => {
    const body = (await request.json()) as Partial<LabReport>;
    const newReport: LabReport = {
      id: `rep-${Date.now()}`,
      patient_id: body.patient_id || "pat-1",
      patient_name: body.patient_name || "Rajesh Kumar",
      title: body.title || "Diagnostic Report",
      category: body.category || "x_ray",
      file_name: body.file_name || "diagnostic_report.pdf",
      file_size: body.file_size || "1.5 MB",
      uploaded_at: getClinicTodayIST(),
      sent_to_whatsapp: false,
    };
    reports.unshift(newReport);
    return HttpResponse.json(newReport, { status: 201 });
  }),

  http.post("/api/reports/:id/send-whatsapp", ({ params }) => {
    const { id } = params;
    const rep = reports.find((r) => r.id === id);
    if (!rep) {
      return new HttpResponse("Report not found", { status: 404 });
    }
    rep.sent_to_whatsapp = true;
    return HttpResponse.json({
      status: "delivered",
      report_id: id,
      message: `PDF ${rep.file_name} sent to ${rep.patient_name}'s WhatsApp.`,
    });
  }),

  // Razorpay Billing & Plans
  http.get("/api/billing/plans", () => {
    return HttpResponse.json({
      plans: MOCK_PLANS,
      subscription: currentSubscription,
    });
  }),

  http.post("/api/billing/subscribe", async ({ request }) => {
    const { plan_id } = (await request.json()) as { plan_id: string };
    const plan = MOCK_PLANS.find((p) => p.id === plan_id) || MOCK_PLANS[1];
    currentSubscription = {
      plan_id: plan.id,
      plan_name: plan.name,
      status: "active",
      renews_at: getRelativeDateIST(30),
    };
    return HttpResponse.json({
      status: "success",
      razorpay_payment_id: `pay_test_${Date.now()}`,
      subscription: currentSubscription,
    });
  }),

  // Super Admin Area Metrics
  http.get("/api/admin/metrics", () => {
    return HttpResponse.json({
      total_clinics: 14,
      active_doctors: 28,
      total_appointments_month: 1248,
      whatsapp_messages_month: 9840,
      active_mrr_inr: 58986,
      clinics: [
        { id: "cln-1", name: "SmileCraft Dental - Bandra West", city: "Mumbai", doctors: 2, status: "active", plan: "Growth Practice" },
        { id: "cln-2", name: "SmileCraft Dental - Andheri East", city: "Mumbai", doctors: 3, status: "active", plan: "Growth Practice" },
        { id: "cln-3", name: "Apex Dental Care", city: "Pune", doctors: 4, status: "active", plan: "Pro Multi-Clinic" },
        { id: "cln-4", name: "Dr. Batra Dental Hub", city: "Delhi NCR", doctors: 1, status: "active", plan: "Starter Clinic" },
      ],
    });
  }),
];
