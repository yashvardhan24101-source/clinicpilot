import { Appointment, AppointmentStatus } from "@/types/api";

export interface QueuedAction {
  id: string;
  appointment_id: string;
  status: AppointmentStatus;
  timestamp: number;
}

const STORAGE_KEY = "clinicpilot_offline_mutation_queue";

export const offlineQueue = {
  getQueue(): QueuedAction[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  enqueue(appointment_id: string, status: AppointmentStatus): QueuedAction {
    const queue = this.getQueue();
    // Filter out previous pending actions for the same appointment to keep latest state
    const filtered = queue.filter((item) => item.appointment_id !== appointment_id);
    const newAction: QueuedAction = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      appointment_id,
      status,
      timestamp: Date.now(),
    };
    filtered.push(newAction);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error("Failed to persist offline queue action", e);
    }
    return newAction;
  },

  remove(id: string) {
    const queue = this.getQueue().filter((item) => item.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.error("Failed to update offline queue", e);
    }
  },

  clear() {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  hasPending(appointment_id: string): boolean {
    return this.getQueue().some((item) => item.appointment_id === appointment_id);
  },
};
