import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { LiveQueueBadge } from "@/components/patient/live-queue-badge";
import { api } from "@/lib/api";

describe("Option 1: Live Queue Badge & Token Tracker", () => {
  it("renders live token status and calculated wait time", async () => {
    vi.spyOn(api, "getQueue").mockResolvedValue({
      current_token: 3,
      total_waiting: 3,
      avg_wait_minutes_per_patient: 15,
      status: "active",
    });

    render(<LiveQueueBadge tokenNumber={6} />);

    await waitFor(() => {
      expect(screen.getByText("Live Clinic Queue Tracker")).toBeInTheDocument();
    });

    expect(screen.getByText(/Token #3/i)).toBeInTheDocument();
    expect(screen.getByText(/#6/i)).toBeInTheDocument();
    // (6 - 3) * 15 = 45 mins
    expect(screen.getByText(/~45 mins/i)).toBeInTheDocument();
  });

  it("indicates when it is the patient's turn now", async () => {
    vi.spyOn(api, "getQueue").mockResolvedValue({
      current_token: 5,
      total_waiting: 1,
      avg_wait_minutes_per_patient: 15,
      status: "active",
    });

    render(<LiveQueueBadge tokenNumber={5} />);

    await waitFor(() => {
      expect(screen.getByText(/It is your turn! Please proceed to the doctor/i)).toBeInTheDocument();
    });
  });
});
