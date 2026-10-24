import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import OfflinePage from "@/app/offline/page";
import { saveTodaySnapshot, purgeAllOfflineData } from "@/lib/offline-snapshot";

describe("Offline Cold Start UI (/offline Page)", () => {
  beforeEach(async () => {
    await purgeAllOfflineData();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders empty state when no cached snapshot exists on cold start", async () => {
    render(<OfflinePage />);

    await waitFor(() => {
      expect(screen.getByTestId("offline-empty-state")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", { name: /No Cached Schedule Available/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No cached schedule available\. Actions are unavailable until you reconnect\./i)
    ).toBeInTheDocument();
  });

  it("reads last active snapshot from storage and displays cached appointments with offline notice", async () => {
    // Populate snapshot before cold starting the /offline page
    await saveTodaySnapshot(
      "clinic-apollo",
      "user-dr-gupta",
      "2026-10-17",
      [
        {
          id: "apt-101",
          time: "09:30",
          patient_name: "Vikram Malhotra",
          service: "Dental Cleaning",
          status: "arrived",
          doctor_name: "Dr. Gupta",
        },
        {
          id: "apt-102",
          time: "10:15",
          patient_name: "Sneha Reddy",
          service: "Extraction",
          status: "booked",
          doctor_name: "Dr. Gupta",
        },
      ],
      "09:15 AM"
    );

    render(<OfflinePage />);

    // Wait for the snapshot to load and render
    await waitFor(() => {
      expect(screen.getByTestId("offline-schedule-container")).toBeInTheDocument();
    });

    // Offline banner copy verification
    expect(
      screen.getByText(
        /Showing the schedule from 09:15 AM\. Actions are unavailable until you reconnect\./i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Last synced: 09:15 AM/i)).toBeInTheDocument();

    // Verify appointment cards display minimal, de-identified patient information
    const cards = screen.getAllByTestId("offline-appointment-card");
    expect(cards).toHaveLength(2);

    expect(screen.getByText("Vikram M.")).toBeInTheDocument();
    expect(screen.getByText("09:30")).toBeInTheDocument();
    expect(screen.getByText(/Dental Cleaning • Dr\. Gupta/i)).toBeInTheDocument();

    expect(screen.getByText("Sneha R.")).toBeInTheDocument();
    expect(screen.getByText("10:15")).toBeInTheDocument();
    expect(screen.getByText(/Extraction • Dr\. Gupta/i)).toBeInTheDocument();

    // Verify counters
    expect(screen.getByText("Cached Schedule (2026-10-17)")).toBeInTheDocument();
    expect(screen.getByText("2 appointments")).toBeInTheDocument();
  });
});
