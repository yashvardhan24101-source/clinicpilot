import { describe, it, expect } from "vitest";
import { formatTimeDisplay, maskPhoneNumber } from "@/lib/utils";

describe("Utility formatters", () => {
  it("formats 24-hour time strings to 12-hour AM/PM", () => {
    expect(formatTimeDisplay("09:30")).toBe("9:30 AM");
    expect(formatTimeDisplay("12:00")).toBe("12:00 PM");
    expect(formatTimeDisplay("14:45")).toBe("2:45 PM");
    expect(formatTimeDisplay("18:15")).toBe("6:15 PM");
  });

  it("masks phone numbers for medical privacy", () => {
    expect(maskPhoneNumber("+91 98765 43210")).toBe("+91 98*** **210");
    expect(maskPhoneNumber("+91 98234 56789")).toBe("+91 98*** **789");
  });
});
