import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  saveTodaySnapshot,
  getTodaySnapshot,
  purgeAllOfflineData,
  extractPatientInitials,
  getLastActiveSnapshot,
} from "@/lib/offline-snapshot";

describe("Group F: Minimal Offline Snapshot & Data Privacy", () => {
  beforeEach(async () => {
    await purgeAllOfflineData();
  });

  it("extracts patient initials or first name and strips out numbers/phone characters", () => {
    expect(extractPatientInitials("Rahul Sharma")).toBe("Rahul S.");
    expect(extractPatientInitials("Priya")).toBe("Priya");
    expect(extractPatientInitials("Amit Kumar Patel")).toBe("Amit P.");
    expect(extractPatientInitials("")).toBe("Patient");
    expect(extractPatientInitials("9876543210")).toBe("Patient");
    expect(extractPatientInitials("+91 9876543210")).toBe("Patient");
  });

  it("saves minimal snapshot and strictly excludes phone numbers, notes, or patient objects", async () => {
    const rawAppointments = [
      {
        id: "apt-1",
        time: "10:30",
        patient_name: "Anita Desai",
        patient_phone: "+919876543210", // MUST BE STRIPPED
        notes: "Confidential dental history", // MUST BE STRIPPED
        patient: {
          id: "pt-1",
          name: "Anita Desai",
          phone: "+919876543210", // MUST BE STRIPPED
        },
        service: "Root Canal",
        status: "booked" as const,
        doctor_name: "Dr. A. Verma",
      },
    ];

    await saveTodaySnapshot(
      "clinic-1",
      "user-1",
      "2026-10-17",
      rawAppointments,
      "10:30 AM"
    );

    const snapshot = await getTodaySnapshot("clinic-1", "user-1", "2026-10-17");
    expect(snapshot).not.toBeNull();
    expect(snapshot?.clinic_id).toBe("clinic-1");
    expect(snapshot?.user_id).toBe("user-1");
    expect(snapshot?.date).toBe("2026-10-17");
    expect(snapshot?.synced_time_display).toBe("10:30 AM");
    expect(snapshot?.appointments.length).toBe(1);

    const savedApt = snapshot!.appointments[0];
    expect(savedApt.id).toBe("apt-1");
    expect(savedApt.time).toBe("10:30");
    expect(savedApt.patient_name_or_initials).toBe("Anita D.");
    expect(savedApt.service).toBe("Root Canal");
    expect(savedApt.status).toBe("booked");
    expect(savedApt.doctor).toBe("Dr. A. Verma");

    // Strict privacy verification: Ensure no sensitive fields exist
    expect((savedApt as any).patient_phone).toBeUndefined();
    expect((savedApt as any).phone).toBeUndefined();
    expect((savedApt as any).notes).toBeUndefined();
    expect((savedApt as any).patient).toBeUndefined();
  });

  it("purges all offline snapshots on purgeAllOfflineData (logout / 401)", async () => {
    await saveTodaySnapshot(
      "clinic-1",
      "user-1",
      "2026-10-17",
      [{ id: "apt-1", patient_name: "Test Patient", status: "booked" }],
      "10:00 AM"
    );

    expect(await getTodaySnapshot("clinic-1", "user-1", "2026-10-17")).not.toBeNull();

    // Trigger purge
    await purgeAllOfflineData();

    // Snapshot is now completely wiped
    expect(await getTodaySnapshot("clinic-1", "user-1", "2026-10-17")).toBeNull();
  });

  it("isolates data between users: User B never sees User A data on user change", async () => {
    // User A logs in and saves today's schedule
    await saveTodaySnapshot(
      "clinic-1",
      "user-A",
      "2026-10-17",
      [{ id: "apt-A", patient_name: "User A Patient", status: "booked" }],
      "09:30 AM"
    );

    // User A's snapshot exists
    const userASnapshot = await getTodaySnapshot("clinic-1", "user-A", "2026-10-17");
    expect(userASnapshot).not.toBeNull();
    expect(userASnapshot?.appointments[0].patient_name_or_initials).toBe("User P.");

    // User B tries to query their schedule before any save -> must be null
    const userBSnapshotInitial = await getTodaySnapshot("clinic-1", "user-B", "2026-10-17");
    expect(userBSnapshotInitial).toBeNull();

    // When User A logs out and User B logs in, purge is executed
    await purgeAllOfflineData();

    // Both are completely purged
    expect(await getTodaySnapshot("clinic-1", "user-A", "2026-10-17")).toBeNull();
    expect(await getTodaySnapshot("clinic-1", "user-B", "2026-10-17")).toBeNull();
  });

  describe("Requirement 4: Snapshot Expiry & Daily Cleanup", () => {
    it("bounds expires_at to <= session expiry and <= 8 hours", async () => {
      const now = Date.now();

      // Case A: No session expiry provided -> defaults to max 8 hours
      await saveTodaySnapshot(
        "clinic-1",
        "user-1",
        "2026-10-17",
        [{ id: "apt-1", patient_name: "John Doe", status: "booked" }],
        "10:00 AM"
      );

      const snapA = await getTodaySnapshot("clinic-1", "user-1", "2026-10-17");
      expect(snapA).not.toBeNull();
      const expiresAtA = new Date(snapA!.expires_at).getTime();
      expect(expiresAtA).toBeGreaterThan(now);
      expect(expiresAtA - now).toBeLessThanOrEqual(8 * 60 * 60 * 1000 + 1000);

      // Case B: Session expiry is 2 hours away -> bounds to 2 hours
      const twoHoursAhead = now + 2 * 60 * 60 * 1000;
      await saveTodaySnapshot(
        "clinic-1",
        "user-1",
        "2026-10-17",
        [{ id: "apt-1", patient_name: "John Doe", status: "booked" }],
        "10:00 AM",
        twoHoursAhead
      );

      const snapB = await getTodaySnapshot("clinic-1", "user-1", "2026-10-17");
      expect(snapB).not.toBeNull();
      const expiresAtB = new Date(snapB!.expires_at).getTime();
      expect(expiresAtB - now).toBeLessThanOrEqual(2 * 60 * 60 * 1000 + 1000);

      // Case C: Session expiry is 24 hours away -> still capped at 8 hours
      const dayAhead = now + 24 * 60 * 60 * 1000;
      await saveTodaySnapshot(
        "clinic-1",
        "user-1",
        "2026-10-17",
        [{ id: "apt-1", patient_name: "John Doe", status: "booked" }],
        "10:00 AM",
        dayAhead
      );

      const snapC = await getTodaySnapshot("clinic-1", "user-1", "2026-10-17");
      expect(snapC).not.toBeNull();
      const expiresAtC = new Date(snapC!.expires_at).getTime();
      expect(expiresAtC - now).toBeLessThanOrEqual(8 * 60 * 60 * 1000 + 1000);
    });

    it("automatically deletes snapshots for other dates on every write", async () => {
      // 1. Write for yesterday (2026-10-16)
      await saveTodaySnapshot(
        "clinic-1",
        "user-1",
        "2026-10-16",
        [{ id: "apt-yesterday", patient_name: "Yesterday Patient", status: "completed" }],
        "05:00 PM"
      );
      expect(await getTodaySnapshot("clinic-1", "user-1", "2026-10-16")).not.toBeNull();

      // 2. Write for today (2026-10-17)
      await saveTodaySnapshot(
        "clinic-1",
        "user-1",
        "2026-10-17",
        [{ id: "apt-today", patient_name: "Today Patient", status: "booked" }],
        "09:00 AM"
      );

      // 3. Yesterday's snapshot must be deleted, today's snapshot remains
      expect(await getTodaySnapshot("clinic-1", "user-1", "2026-10-16")).toBeNull();
      expect(await getTodaySnapshot("clinic-1", "user-1", "2026-10-17")).not.toBeNull();
    });

    it("never displays expired snapshots and purges them on read", async () => {
      // Save snapshot that expired 1 minute ago
      const expiredTime = new Date(Date.now() - 60000).toISOString();
      await saveTodaySnapshot(
        "clinic-1",
        "user-1",
        "2026-10-17",
        [{ id: "apt-1", patient_name: "Patient A", status: "booked" }],
        "08:00 AM",
        Date.now() - 60000
      );

      // Reading it should return null because it's expired
      const result = await getTodaySnapshot("clinic-1", "user-1", "2026-10-17");
      expect(result).toBeNull();
    });
  });

  describe("Requirement 3: Offline Cold Start & Last-Active Pointer", () => {
    it("stores last active pointer with clinic_id:user_id:date and getLastActiveSnapshot retrieves it", async () => {
      await saveTodaySnapshot(
        "clinic-99",
        "doc-42",
        "2026-10-17",
        [
          {
            id: "apt-offline-1",
            time: "11:00",
            patient_name: "Suresh Raina",
            service: "Orthopedics",
            status: "arrived",
            doctor_name: "Dr. K. Sharma",
          },
        ],
        "11:00 AM"
      );

      // Check last-active pointer in localStorage
      expect(localStorage.getItem("clinicpilot_last_active_snapshot_key")).toBe(
        "clinic-99:doc-42:2026-10-17"
      );

      // Cold start: simulate retrieving without knowing active clinic/user in context
      const coldStartSnapshot = await getLastActiveSnapshot();
      expect(coldStartSnapshot).not.toBeNull();
      expect(coldStartSnapshot?.clinic_id).toBe("clinic-99");
      expect(coldStartSnapshot?.user_id).toBe("doc-42");
      expect(coldStartSnapshot?.date).toBe("2026-10-17");
      expect(coldStartSnapshot?.appointments.length).toBe(1);
      expect(coldStartSnapshot?.appointments[0].patient_name_or_initials).toBe("Suresh R.");
      expect(coldStartSnapshot?.appointments[0].service).toBe("Orthopedics");
      expect(coldStartSnapshot?.appointments[0].status).toBe("arrived");
    });
  });
});

