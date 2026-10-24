import { AppointmentStatus } from "@/types/api";

export interface MinimalSnapshotAppointment {
  id: string;
  time: string;
  patient_name_or_initials: string;
  service: string;
  status: AppointmentStatus;
  doctor: string;
}

export interface TodayScheduleSnapshot {
  key: string; // clinic_id:user_id:date
  clinic_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  synced_at: string;
  synced_time_display: string;
  expires_at: string; // ISO string <= session expiry and <= 12 hours
  appointments: MinimalSnapshotAppointment[];
}

const DB_NAME = "clinicpilot_offline_v1";
const STORE_NAME = "today_snapshots";
const DB_VERSION = 1;
export const MAX_SNAPSHOT_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours max (Group F.2 requirement)
export const LAST_ACTIVE_STORAGE_KEY = "clinicpilot_last_active_snapshot_key";

/**
 * Extracts first name or initials (e.g. Rahul S. or Rahul) from a full name.
 * Strictly guarantees no phone numbers or personal details are leaked into offline storage.
 */
export function extractPatientInitials(name?: string): string {
  if (!name || typeof name !== "string" || !name.trim()) return "Patient";
  const cleaned = name.trim().replace(/[0-9+]/g, "").trim(); // strip any digit/phone chars
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Patient";
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0].toUpperCase();
  return `${first} ${lastInitial}.`;
}

// In-memory fallback map for non-browser / unit test environments
const inMemoryFallbackStore = new Map<string, TodayScheduleSnapshot>();
let inMemoryLastActivePointer: string | null = null;

function getIndexedDB(): IDBFactory | null {
  if (typeof window !== "undefined" && window.indexedDB) {
    return window.indexedDB;
  }
  if (typeof globalThis !== "undefined" && (globalThis as any).indexedDB) {
    return (globalThis as any).indexedDB;
  }
  return null;
}

function openDatabase(): Promise<IDBDatabase> {
  const idb = getIndexedDB();
  if (!idb) {
    return Promise.reject(new Error("IndexedDB not available in this environment"));
  }

  return new Promise((resolve, reject) => {
    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Creates a unique key for the schedule snapshot scoped strictly by clinic, user, and date.
 */
export function getSnapshotKey(clinicId: string, userId: string, date: string): string {
  return `${clinicId}:${userId}:${date}`;
}

/**
 * Determines whether a snapshot has expired.
 */
export function isSnapshotExpired(snapshot: TodayScheduleSnapshot): boolean {
  if (!snapshot.expires_at) return true;
  return new Date(snapshot.expires_at).getTime() <= Date.now();
}

/**
 * Saves a minimal today schedule snapshot.
 * Requirements:
 * 1. Stores expires_at (<= session expiry and <= 12 hours)
 * 2. Deletes snapshots for other dates on every write
 * 3. Sets last-active pointer with the clinic_id:user_id:date key
 * 4. NEVER stores phone numbers, messages, reports, or full patient details
 */
export async function saveTodaySnapshot(
  clinicId: string,
  userId: string,
  date: string,
  appointments: Array<{
    id: string;
    time?: string;
    patient_name?: string;
    patient?: { name?: string };
    service?: string;
    service_name?: string;
    status: AppointmentStatus;
    doctor_name?: string;
  }>,
  syncedTimeDisplay: string,
  sessionExpiresAt?: string | number
): Promise<void> {
  const key = getSnapshotKey(clinicId, userId, date);

  // 1. Calculate expires_at (<= session expiry and <= 12 hours)
  const maxExpiryTime = Date.now() + MAX_SNAPSHOT_TTL_MS;
  const expiresAtMs = sessionExpiresAt
    ? Math.min(new Date(sessionExpiresAt).getTime(), maxExpiryTime)
    : maxExpiryTime;
  const expiresAt = new Date(expiresAtMs).toISOString();

  // 2. Filter and map ONLY minimal fields
  const minimalAppointments: MinimalSnapshotAppointment[] = appointments.map((apt) => {
    const rawName = apt.patient_name || apt.patient?.name || "";
    return {
      id: apt.id,
      time: apt.time || "09:00",
      patient_name_or_initials: extractPatientInitials(rawName),
      service: apt.service || apt.service_name || "Consultation",
      status: apt.status || "booked",
      doctor: apt.doctor_name || "Doctor",
    };
  });

  const snapshot: TodayScheduleSnapshot = {
    key,
    clinic_id: clinicId,
    user_id: userId,
    date,
    synced_at: new Date().toISOString(),
    synced_time_display: syncedTimeDisplay,
    expires_at: expiresAt,
    appointments: minimalAppointments,
  };

  // 3. Store "last active" pointer
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LAST_ACTIVE_STORAGE_KEY, key);
    } catch {}
  }
  inMemoryLastActivePointer = key;

  // 4. Clean up other dates in in-memory fallback
  for (const [k, s] of inMemoryFallbackStore.entries()) {
    if (s.date !== date) {
      inMemoryFallbackStore.delete(k);
    }
  }
  inMemoryFallbackStore.set(key, snapshot);

  const idb = getIndexedDB();
  if (!idb) {
    return;
  }

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      // Delete snapshots for other dates on every write
      const reqAll = store.getAll();
      reqAll.onsuccess = () => {
        const allRecords = reqAll.result as TodayScheduleSnapshot[];
        for (const record of allRecords) {
          if (record && record.date && record.date !== date) {
            store.delete(record.key);
          }
        }
        // Put the new snapshot
        store.put(snapshot);
      };
      reqAll.onerror = () => {
        store.put(snapshot);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // In-memory fallback already populated
  }
}

/**
 * Retrieves a minimal schedule snapshot for a specific clinic, user, and date.
 * Strictly guarantees expired snapshots are NEVER displayed.
 */
export async function getTodaySnapshot(
  clinicId: string,
  userId: string,
  date: string
): Promise<TodayScheduleSnapshot | null> {
  const key = getSnapshotKey(clinicId, userId, date);

  let snapshot: TodayScheduleSnapshot | null = null;
  const idb = getIndexedDB();

  if (idb) {
    try {
      const db = await openDatabase();
      snapshot = await new Promise<TodayScheduleSnapshot | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      db.close();
    } catch {}
  }

  if (!snapshot) {
    snapshot = inMemoryFallbackStore.get(key) || null;
  }

  if (!snapshot) return null;

  // Never display expired snapshots
  if (isSnapshotExpired(snapshot)) {
    // Purge expired record
    inMemoryFallbackStore.delete(key);
    if (idb) {
      try {
        const db = await openDatabase();
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(key);
        db.close();
      } catch {}
    }
    return null;
  }

  return snapshot;
}

/**
 * Retrieves the last active schedule snapshot pointer.
 * Used by /offline cold start when the user opens the PWA without any network.
 */
export async function getLastActiveSnapshot(): Promise<TodayScheduleSnapshot | null> {
  let pointer: string | null = inMemoryLastActivePointer;
  if (typeof window !== "undefined") {
    try {
      pointer = localStorage.getItem(LAST_ACTIVE_STORAGE_KEY) || pointer;
    } catch {}
  }

  if (!pointer) {
    // Check if any valid snapshot exists in fallback or indexeddb
    const firstMem = Array.from(inMemoryFallbackStore.values())[0];
    if (firstMem && !isSnapshotExpired(firstMem)) {
      return firstMem;
    }

    const idb = getIndexedDB();
    if (idb) {
      try {
        const db = await openDatabase();
        const records = await new Promise<TodayScheduleSnapshot[]>((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, "readonly");
          const req = tx.objectStore(STORE_NAME).getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => reject(req.error);
        });
        db.close();
        const valid = records.find((r) => r && !isSnapshotExpired(r));
        if (valid) return valid;
      } catch {}
    }
    return null;
  }

  const [clinicId, userId, date] = pointer.split(":");
  if (!clinicId || !userId || !date) return null;

  return getTodaySnapshot(clinicId, userId, date);
}

/**
 * Wipes all offline snapshots, last active pointer, and CacheStorage caches.
 */
export async function purgeAllOfflineData(): Promise<void> {
  // 1. Wipe in-memory fallback
  inMemoryFallbackStore.clear();
  inMemoryLastActivePointer = null;

  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LAST_ACTIVE_STORAGE_KEY);
    } catch {}
  }

  // 2. Wipe IndexedDB snapshots
  const idb = getIndexedDB();
  if (idb) {
    try {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      db.close();
    } catch {}
  }

  // 3. Wipe all CacheStorage caches
  if (typeof window !== "undefined" && "caches" in window) {
    try {
      const keys = await window.caches.keys();
      await Promise.all(keys.map((k) => window.caches.delete(k)));
    } catch {}
  }

  // 4. Send PURGE_ALL_CACHES signal to Service Worker if active
  if (
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    navigator.serviceWorker.controller
  ) {
    try {
      navigator.serviceWorker.controller.postMessage({ type: "PURGE_ALL_CACHES" });
    } catch {}
  }
}
