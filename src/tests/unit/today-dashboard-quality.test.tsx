import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TodayPage from "@/app/(dashboard)/today/page";
import { TimeRail } from "@/components/today/time-rail";
import { api } from "@/lib/api";
import { Appointment } from "@/types/api";
import * as dateHelpers from "@/lib/date-helpers";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/today",
}));

describe("Group B: Issue 4 - Today Screen Quality & Robustness", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
  });

  const renderTodayPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <TodayPage />
      </QueryClientProvider>
    );
  };

  it("1. Loading State: displays skeleton loaders for the 4 counters and rail (NEVER flashes 0)", () => {
    // Hang the getAppointments promise to keep the component in loading state
    vi.spyOn(api, "getAppointments").mockImplementation(
      () => new Promise(() => {}) // never resolves
    );
    vi.spyOn(api, "getDoctors").mockResolvedValue([]);
    vi.spyOn(api, "getServices").mockResolvedValue([]);

    renderTodayPage();

    // Skeletons must be present for counters
    const counterSkeletons = screen.getAllByTestId("counter-skeleton");
    expect(counterSkeletons.length).toBe(4);

    // Rail skeleton must be present
    expect(screen.getByTestId("rail-loading-skeleton")).toBeInTheDocument();

    // Verify it NEVER flashes '0' in the count divs while loading
    expect(screen.queryByTestId("count-booked")).toBeNull();
    expect(screen.queryByTestId("count-arrived")).toBeNull();
    expect(screen.queryByTestId("count-completed")).toBeNull();
    expect(screen.queryByTestId("count-no-show")).toBeNull();
  });

  it("2. Empty State: renders exact prompt and New appointment CTA when 0 appointments", async () => {
    vi.spyOn(api, "getAppointments").mockResolvedValue([]);
    vi.spyOn(api, "getDoctors").mockResolvedValue([]);
    vi.spyOn(api, "getServices").mockResolvedValue([]);

    renderTodayPage();

    await waitFor(() => {
      expect(screen.getByTestId("empty-schedule-card")).toBeInTheDocument();
    });

    // Exact required text
    expect(
      screen.getByText("No appointments today. Tap an open slot to book one.")
    ).toBeInTheDocument();

    // New appointment button in empty state
    const emptyCtas = screen.getAllByRole("button", { name: /new appointment/i });
    expect(emptyCtas.length).toBeGreaterThanOrEqual(2); // Top bar + empty state

    // Metric counts reflect 0 after load
    expect(screen.getByTestId("count-booked").textContent).toBe("0");
    expect(screen.getByTestId("count-arrived").textContent).toBe("0");
    expect(screen.getByTestId("count-completed").textContent).toBe("0");
    expect(screen.getByTestId("count-no-show").textContent).toBe("0");
  });

  it("3. Error State: renders error card with Try again button that refetches", async () => {
    const getApptsSpy = vi
      .spyOn(api, "getAppointments")
      .mockRejectedValue(new Error("Network Error"));
    vi.spyOn(api, "getDoctors").mockResolvedValue([]);
    vi.spyOn(api, "getServices").mockResolvedValue([]);

    renderTodayPage();

    await waitFor(() => {
      expect(screen.getByTestId("error-card")).toBeInTheDocument();
    });

    expect(screen.getByText("Unable to load today's schedule")).toBeInTheDocument();

    const tryAgainBtn = screen.getByRole("button", { name: /try again/i });
    expect(tryAgainBtn).toBeInTheDocument();

    // Reset spy to succeed on retry
    getApptsSpy.mockResolvedValue([]);
    fireEvent.click(tryAgainBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("error-card")).toBeNull();
      expect(screen.getByTestId("empty-schedule-card")).toBeInTheDocument();
    });
  });

  it("4. Offline State: renders offline banner with last synced time", async () => {
    vi.spyOn(api, "getAppointments").mockResolvedValue([]);
    vi.spyOn(api, "getDoctors").mockResolvedValue([]);
    vi.spyOn(api, "getServices").mockResolvedValue([]);

    renderTodayPage();

    await waitFor(() => {
      expect(screen.getByTestId("empty-schedule-card")).toBeInTheDocument();
    });

    // Trigger offline event
    fireEvent(window, new Event("offline"));

    await waitFor(() => {
      const banner = screen.getByTestId("offline-banner");
      expect(banner).toBeInTheDocument();
      expect(banner.textContent).toContain("You're offline. Showing the schedule from");
      expect(banner.textContent).toContain("Actions are unavailable until you reconnect.");
      expect(banner.textContent).toContain("Last synced:");
    });

    // Trigger online event to recover
    fireEvent(window, new Event("online"));

    await waitFor(() => {
      expect(screen.queryByTestId("offline-banner")).toBeNull();
    });
  });

  it("5. Populated State: counts match the list and rail visuals are rendered", async () => {
    vi.spyOn(dateHelpers, "getClinicMinutesIST").mockReturnValue(10 * 60); // 10:00 AM IST
    vi.spyOn(dateHelpers, "getClinicTimeDisplayIST").mockReturnValue("10:00 AM");

    const mockAppointments: Appointment[] = [
      {
        id: "apt-1",
        clinic_id: "cln-1",
        patient_id: "pat-1",
        patient_name: "Rajesh Kumar",
        patient_phone: "+91 98765 43210",
        doctor_id: "doc-1",
        doctor_name: "Dr. Ananya Sharma",
        service_id: "srv-1",
        service_name: "Root Canal",
        date: "2026-10-13",
        start_time: "09:00",
        end_time: "09:30",
        status: "completed",
        source: "whatsapp",
        created_at: "2026-10-10T10:00:00Z",
        updated_at: "2026-10-10T10:00:00Z",
      },
      {
        id: "apt-2",
        clinic_id: "cln-1",
        patient_id: "pat-2",
        patient_name: "Sunita Devi",
        patient_phone: "+91 98111 22233",
        doctor_id: "doc-1",
        doctor_name: "Dr. Ananya Sharma",
        service_id: "srv-2",
        service_name: "Dental Checkup",
        date: "2026-10-13",
        start_time: "10:30", // 60 min gap from 09:30 -> triggers open slot!
        end_time: "11:00",
        status: "arrived",
        source: "walkin",
        created_at: "2026-10-10T10:00:00Z",
        updated_at: "2026-10-10T10:00:00Z",
      },
      {
        id: "apt-3",
        clinic_id: "cln-1",
        patient_id: "pat-3",
        patient_name: "Priya Varma",
        patient_phone: "+91 98222 33344",
        doctor_id: "doc-1",
        doctor_name: "Dr. Ananya Sharma",
        service_id: "srv-3",
        service_name: "Scaling",
        date: "2026-10-13",
        start_time: "14:00",
        end_time: "14:30",
        status: "booked",
        source: "whatsapp",
        created_at: "2026-10-10T10:00:00Z",
        updated_at: "2026-10-10T10:00:00Z",
      },
      {
        id: "apt-4",
        clinic_id: "cln-1",
        patient_id: "pat-4",
        patient_name: "Amit Patel",
        patient_phone: "+91 98333 44455",
        doctor_id: "doc-1",
        doctor_name: "Dr. Ananya Sharma",
        service_id: "srv-4",
        service_name: "Consultation",
        date: "2026-10-13",
        start_time: "16:00",
        end_time: "16:30",
        status: "no_show",
        source: "walkin",
        created_at: "2026-10-10T10:00:00Z",
        updated_at: "2026-10-10T10:00:00Z",
      },
    ];

    vi.spyOn(api, "getAppointments").mockResolvedValue(mockAppointments);
    vi.spyOn(api, "getDoctors").mockResolvedValue([
      { id: "doc-1", name: "Dr. Ananya Sharma", color_tag: "#1F6FEB" } as any,
    ]);
    vi.spyOn(api, "getServices").mockResolvedValue([]);

    renderTodayPage();

    await waitFor(() => {
      expect(screen.getByTestId("time-rail")).toBeInTheDocument();
    });

    // Verify 4 counter cards EXACTLY match the list:
    // Booked: 1, Arrived: 1, Completed: 1, No-Show: 1
    expect(screen.getByTestId("count-booked").textContent).toBe("1");
    expect(screen.getByTestId("count-arrived").textContent).toBe("1");
    expect(screen.getByTestId("count-completed").textContent).toBe("1");
    expect(screen.getByTestId("count-no-show").textContent).toBe("1");

    // Live glowing now marker rendered
    expect(screen.getByTestId("live-now-marker")).toBeInTheDocument();

    // Next appointment badge rendered
    expect(screen.getByTestId("next-appointment-badge")).toBeInTheDocument();

    // When "All Doctors" is active, open slots must NOT be shown
    expect(screen.queryAllByTestId("tappable-open-slot").length).toBe(0);

    // Click on specific doctor filter pill
    const doctorPill = screen.getByRole("button", { name: /dr\. ananya sharma/i });
    fireEvent.click(doctorPill);

    // Tappable open slots rendered per doctor inside working hours (09:00 - 18:00)
    await waitFor(() => {
      const openSlotBtns = screen.getAllByTestId("tappable-open-slot");
      expect(openSlotBtns.length).toBeGreaterThan(0);
      expect(openSlotBtns[0].textContent).toContain("Open Slot");
    });

    const openSlotBtns = screen.getAllByTestId("tappable-open-slot");
    fireEvent.click(openSlotBtns[0]);
    expect(screen.getByText("New Walk-in / Booking")).toBeInTheDocument();
  });

  it("6. TimeRail: hides NOW marker when viewing a date that is not today", () => {
    const mockAppointments: Appointment[] = [
      {
        id: "apt-1",
        clinic_id: "cln-1",
        patient_id: "pat-1",
        patient_name: "Rajesh Kumar",
        patient_phone: "+91 98765 43210",
        doctor_id: "doc-1",
        doctor_name: "Dr. Ananya Sharma",
        service_id: "srv-1",
        service_name: "Root Canal",
        date: "2026-10-14",
        start_time: "10:00",
        end_time: "10:30",
        status: "booked",
        source: "whatsapp",
        created_at: "2026-10-10T10:00:00Z",
        updated_at: "2026-10-10T10:00:00Z",
      },
    ];

    const { rerender } = render(
      <TimeRail
        appointments={mockAppointments}
        onStatusChange={vi.fn()}
        onOpenQuickBook={vi.fn()}
        selectedDoctor="doc-1"
        isToday={false} // Past or future date
      />
    );

    // NOW marker must NOT be rendered when isToday=false
    expect(screen.queryByTestId("live-now-marker")).toBeNull();

    // Rerender with isToday=true
    rerender(
      <TimeRail
        appointments={mockAppointments}
        onStatusChange={vi.fn()}
        onOpenQuickBook={vi.fn()}
        selectedDoctor="doc-1"
        isToday={true}
      />
    );

    // NOW marker must be rendered when isToday=true
    expect(screen.getByTestId("live-now-marker")).toBeInTheDocument();
  });

  it("7. TimeRail: computes open slots before first, between, and after last appointment inside working hours (09:00-18:00)", () => {
    const mockAppointments: Appointment[] = [
      {
        id: "apt-1",
        clinic_id: "cln-1",
        patient_id: "pat-1",
        patient_name: "Rajesh Kumar",
        patient_phone: "+91 98765 43210",
        doctor_id: "doc-1",
        doctor_name: "Dr. Ananya Sharma",
        service_id: "srv-1",
        service_name: "Consultation",
        date: "2026-10-13",
        start_time: "10:30", // Gap before: 09:00 to 10:30 (90 mins)
        end_time: "11:00",
        status: "completed",
        source: "walkin",
        created_at: "2026-10-10T10:00:00Z",
        updated_at: "2026-10-10T10:00:00Z",
      },
      {
        id: "apt-2",
        clinic_id: "cln-1",
        patient_id: "pat-2",
        patient_name: "Sunita Devi",
        patient_phone: "+91 98111 22233",
        doctor_id: "doc-1",
        doctor_name: "Dr. Ananya Sharma",
        service_id: "srv-2",
        service_name: "Checkup",
        date: "2026-10-13",
        start_time: "13:00", // Gap between: 11:00 to 13:00 (120 mins)
        end_time: "13:30",
        status: "booked",
        source: "whatsapp",
        created_at: "2026-10-10T10:00:00Z",
        updated_at: "2026-10-10T10:00:00Z",
      },
      // Trailing gap after 13:30 to 18:00 (270 mins)
    ];

    render(
      <TimeRail
        appointments={mockAppointments}
        onStatusChange={vi.fn()}
        onOpenQuickBook={vi.fn()}
        selectedDoctor="doc-1"
        isToday={true}
      />
    );

    const slots = screen.getAllByTestId("tappable-open-slot");
    // Must find 3 open slots: initial (09:00), middle (11:00), and trailing (13:30)
    expect(slots.length).toBe(3);
    expect(slots[0].textContent).toContain("9:00 AM");
    expect(slots[1].textContent).toContain("11:00 AM");
    expect(slots[2].textContent).toContain("1:30 PM");
  });
});
