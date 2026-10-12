import { NextResponse } from "next/server";
import { serverStore } from "@/lib/server-store";
import { MOCK_DOCTORS, MOCK_SERVICES } from "@/mocks/seed-data";
import { Appointment, Conversation } from "@/types/api";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const doctorId = url.searchParams.get("doctor_id");
  const status = url.searchParams.get("status");
  const date = url.searchParams.get("date");

  let result = [...serverStore.appointments];

  if (doctorId && doctorId !== "all") {
    result = result.filter((a) => a.doctor_id === doctorId);
  }

  if (status && status !== "all") {
    result = result.filter((a) => a.status === status);
  }

  if (date) {
    result = result.filter((a) => a.date === date);
  }

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<Appointment>;
  const bookingCode = body.booking_code || `CP-${Math.floor(1000 + Math.random() * 9000)}`;

  const tokenNumber = serverStore.appointments.length + 1;
  const currentToken = serverStore.queueState.current_token;
  const waitMins = Math.max(0, (tokenNumber - currentToken) * 15);

  const newAppointment: Appointment = {
    id: `apt-${Date.now()}`,
    patient_id: body.patient_id || `pat-${Date.now()}`,
    patient_name: body.patient_name || "Online Patient",
    patient_phone: body.patient_phone || "+91 99999 00000",
    doctor_id: body.doctor_id || MOCK_DOCTORS[0].id,
    doctor_name: body.doctor_name || MOCK_DOCTORS[0].name,
    service_id: body.service_id || MOCK_SERVICES[0].id,
    service_name: body.service_name || "General Consultation",
    date: body.date || new Date().toISOString().split("T")[0],
    start_time: body.start_time || "11:00",
    end_time: body.end_time || "11:30",
    status: body.status || "booked",
    source: body.source || "online",
    consultation_type: body.consultation_type || "in_clinic",
    patient_age: body.patient_age,
    patient_gender: body.patient_gender,
    booking_code: bookingCode,
    token_number: body.token_number || tokenNumber,
    estimated_wait_minutes: body.estimated_wait_minutes || waitMins,
    attached_file_name: body.attached_file_name,
    notes: body.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  serverStore.appointments.unshift(newAppointment);

  // Sync to WhatsApp conversation thread
  const convId = `conv-${Date.now()}`;
  const newConv: Conversation = {
    id: convId,
    patient_id: newAppointment.patient_id,
    patient_name: newAppointment.patient_name,
    patient_phone: newAppointment.patient_phone,
    state: "bot_handling",
    last_message: `Your appointment with ${newAppointment.doctor_name} is confirmed! Token #${newAppointment.token_number} (Ref: #${bookingCode})`,
    last_message_time: "Just now",
    unread_count: 0,
    messages: [
      {
        id: `msg-${Date.now()}-1`,
        conversation_id: convId,
        sender: "bot",
        content: `Hi ${newAppointment.patient_name}, your appointment with ${newAppointment.doctor_name} on ${newAppointment.date} at ${newAppointment.start_time} has been scheduled!\n🎟️ Token Number: #${newAppointment.token_number}\n📋 Pass Code: #${bookingCode}\n⏱️ Est. Wait: ~${newAppointment.estimated_wait_minutes} mins.`,
        timestamp: new Date().toISOString(),
        delivery_status: "delivered",
      },
    ],
  };
  serverStore.conversations.unshift(newConv);

  return NextResponse.json(newAppointment, { status: 201 });
}
