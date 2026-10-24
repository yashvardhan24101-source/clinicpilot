export interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __clinicpilot_otp_store__: Map<string, OtpEntry> | undefined;
}

export const otpStore: Map<string, OtpEntry> =
  global.__clinicpilot_otp_store__ ||
  (global.__clinicpilot_otp_store__ = new Map<string, OtpEntry>());
