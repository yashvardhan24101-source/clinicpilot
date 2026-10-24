/**
 * IST (Asia/Kolkata) Clinic Date & Time Helpers
 * 
 * Guarantees that serverless environments running in UTC (e.g. Vercel)
 * and client browsers strictly align to Indian Standard Time (UTC+05:30).
 * Prevents UTC day rollover bugs (e.g. 00:30 IST / 05:00 IST showing yesterday's date).
 */

export const DEFAULT_CLINIC_TZ = "Asia/Kolkata";
export const CLINIC_TIMEZONE = DEFAULT_CLINIC_TZ;

/**
 * Returns the current date in Asia/Kolkata as 'YYYY-MM-DD'.
 * Replaces all occurrences of `toISOString().split('T')[0]`.
 */
export function getClinicTodayIST(dateInput: Date | number | string = new Date()): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_CLINIC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Returns minutes from midnight (0 to 1439) in Asia/Kolkata.
 */
export function getClinicMinutesIST(dateInput: Date | number | string = new Date()): number {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DEFAULT_CLINIC_TZ,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(d);

  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10) % 24;
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
  return hour * 60 + minute;
}

/**
 * Returns 12-hour formatted time in Asia/Kolkata (e.g., '11:30 AM').
 */
export function getClinicTimeDisplayIST(dateInput: Date | number | string = new Date()): string {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  return d.toLocaleTimeString("en-IN", {
    timeZone: DEFAULT_CLINIC_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Returns 'YYYY-MM-DD' offset by a given number of days in Asia/Kolkata.
 * Used for dynamic seed data generation relative to today.
 */
export function getRelativeDateIST(offsetDays: number, referenceDate: Date | number | string = new Date()): string {
  const d = referenceDate instanceof Date ? new Date(referenceDate.getTime()) : new Date(referenceDate);
  // Using 24 hour blocks
  const offsetMs = offsetDays * 24 * 60 * 60 * 1000;
  const targetDate = new Date(d.getTime() + offsetMs);
  return getClinicTodayIST(targetDate);
}

/**
 * Formats appointment dates into readable localized format (e.g. "Today, 13 Oct 2026")
 * comparing against Asia/Kolkata today.
 */
export function formatClinicDateDisplay(dateStr: string, referenceDate: Date | number | string = new Date()): string {
  try {
    if (!dateStr) return "";
    const todayIST = getClinicTodayIST(referenceDate);
    const isToday = dateStr === todayIST;

    const parts = dateStr.split("-").map(Number);
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

    const formatted = d.toLocaleDateString("en-IN", {
      timeZone: "UTC",
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return isToday ? `Today, ${formatted}` : formatted;
  } catch {
    return dateStr;
  }
}
