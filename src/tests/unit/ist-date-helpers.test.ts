import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getClinicTodayIST,
  getClinicMinutesIST,
  getClinicTimeDisplayIST,
  getRelativeDateIST,
  formatClinicDateDisplay,
  DEFAULT_CLINIC_TZ,
  CLINIC_TIMEZONE,
} from "@/lib/date-helpers";

describe("Group B: Issue 3 - IST Date Helpers & Clock-Mocked Boundary Tests", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("1. Clock-mocked at 23:30 IST: correctly computes IST date, minutes, and agrees across client/server", () => {
    // 23:30 IST on 12 Oct 2026 corresponds to 18:00 UTC on 12 Oct 2026
    const utcDate = new Date("2026-10-12T18:00:00.000Z");
    vi.setSystemTime(utcDate);

    const todayIST = getClinicTodayIST();
    const minutesIST = getClinicMinutesIST();
    const timeDisplayIST = getClinicTimeDisplayIST();

    // Verification
    expect(todayIST).toBe("2026-10-12");
    expect(minutesIST).toBe(23 * 60 + 30); // 1410 minutes
    expect(timeDisplayIST).toMatch(/11:30\s*PM/i);

    // Both server environment (mocking UTC) and client helper agree on "today"
    expect(getClinicTodayIST(new Date())).toBe("2026-10-12");
    expect(formatClinicDateDisplay(todayIST)).toContain("Today, 12 Oct 2026");
  });

  it("2. Clock-mocked at 00:30 IST: detects next-day rollover even when UTC server is still on yesterday", () => {
    // 00:30 IST on 13 Oct 2026 corresponds to 19:00 UTC on 12 Oct 2026
    const utcDate = new Date("2026-10-12T19:00:00.000Z");
    vi.setSystemTime(utcDate);

    // Old flawed method would return yesterday in UTC:
    const buggyUtcDate = new Date().toISOString().split("T")[0];
    expect(buggyUtcDate).toBe("2026-10-12"); // Flawed UTC day

    // Our IST helper correctly returns today in Indian Standard Time:
    const correctISTDate = getClinicTodayIST();
    expect(correctISTDate).toBe("2026-10-13"); // Correct IST day!

    const minutesIST = getClinicMinutesIST();
    expect(minutesIST).toBe(30); // 0 hours * 60 + 30 minutes

    const timeDisplayIST = getClinicTimeDisplayIST();
    expect(timeDisplayIST).toMatch(/12:30\s*AM/i);

    // Server and client agree on today as 2026-10-13
    expect(formatClinicDateDisplay("2026-10-13")).toContain("Today, 13 Oct 2026");
    expect(formatClinicDateDisplay("2026-10-12")).not.toContain("Today");
  });

  it("3. Clock-mocked at 05:00 IST: detects early morning IST rollover while UTC is 23:30 previous day", () => {
    // 05:00 IST on 13 Oct 2026 corresponds to 23:30 UTC on 12 Oct 2026
    const utcDate = new Date("2026-10-12T23:30:00.000Z");
    vi.setSystemTime(utcDate);

    // Buggy UTC toISOString split
    const buggyUtcDate = new Date().toISOString().split("T")[0];
    expect(buggyUtcDate).toBe("2026-10-12"); // Flawed UTC day

    // Our IST helper
    const correctISTDate = getClinicTodayIST();
    expect(correctISTDate).toBe("2026-10-13");

    const minutesIST = getClinicMinutesIST();
    expect(minutesIST).toBe(5 * 60); // 300 minutes

    const timeDisplayIST = getClinicTimeDisplayIST();
    expect(timeDisplayIST).toMatch(/5:00\s*AM/i);

    expect(formatClinicDateDisplay("2026-10-13")).toContain("Today, 13 Oct 2026");
  });

  it("4. Relative IST date generator correctly calculates offsets in Asia/Kolkata", () => {
    const fixedTime = new Date("2026-10-13T06:00:00.000Z"); // 11:30 AM IST on 13 Oct 2026
    vi.setSystemTime(fixedTime);

    expect(getClinicTodayIST()).toBe("2026-10-13");
    expect(getRelativeDateIST(0)).toBe("2026-10-13");
    expect(getRelativeDateIST(1)).toBe("2026-10-14");
    expect(getRelativeDateIST(7)).toBe("2026-10-20");
    expect(getRelativeDateIST(-1)).toBe("2026-10-12");
    expect(getRelativeDateIST(-30)).toBe("2026-09-13");
  });

  it("5. Date display helper formats dates properly and labels today correctly", () => {
    const fixedTime = new Date("2026-10-13T04:00:00.000Z"); // 09:30 AM IST on 13 Oct 2026
    vi.setSystemTime(fixedTime);

    expect(formatClinicDateDisplay("2026-10-13")).toBe("Today, 13 Oct 2026");
    expect(formatClinicDateDisplay("2026-10-14")).toBe("14 Oct 2026");
    expect(formatClinicDateDisplay("2026-10-12")).toBe("12 Oct 2026");
    expect(formatClinicDateDisplay("")).toBe("");
  });
});
