import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a 24-hour time string like "09:30" or ISO to formatted display string like "9:30 AM"
 */
export function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return "";
  if (timeStr.includes("T")) {
    const d = new Date(timeStr);
    return d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Mask Indian phone numbers for privacy by default (e.g. +91 98765 43210 -> +91 98*** **210)
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return "";
  const cleaned = phone.trim();
  if (cleaned.startsWith("+91")) {
    const rawDigits = cleaned.replace(/[^\d]/g, "").slice(2);
    if (rawDigits.length >= 10) {
      const first2 = rawDigits.slice(0, 2);
      const last3 = rawDigits.slice(-3);
      return `+91 ${first2}*** **${last3}`;
    }
  }
  const digits = cleaned.replace(/[^\d]/g, "");
  if (digits.length >= 10) {
    const first2 = digits.slice(0, 2);
    const last3 = digits.slice(-3);
    return `${first2}*** **${last3}`;
  }
  return phone;
}

/**
 * Formats appointment dates into readable localized format (e.g. "Today, 12 Oct 2026")
 */
export function formatDateDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    const formatted = d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return isToday ? `Today, ${formatted}` : formatted;
  } catch {
    return dateStr;
  }
}
