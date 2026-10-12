import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { WhatsAppPhoneSimulator } from "@/components/patient/whatsapp-phone-simulator";

describe("Option 2: Live WhatsApp Simulator Phone Mockup", () => {
  it("renders floating trigger and opens simulated WhatsApp chat", () => {
    render(<WhatsAppPhoneSimulator />);

    const triggerBtn = screen.getByTitle(/Open Live WhatsApp Notification Simulator/i);
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);

    expect(screen.getByText("SmileCraft Clinic Bot")).toBeInTheDocument();
    expect(screen.getByText(/Namaste! Welcome to SmileCraft/i)).toBeInTheDocument();
    expect(screen.getByText(/My Token/i)).toBeInTheDocument();
    expect(screen.getByText(/Clinic Location/i)).toBeInTheDocument();
  });

  it("sends quick reply and receives automated bot response", async () => {
    render(<WhatsAppPhoneSimulator />);

    const triggerBtn = screen.getByTitle(/Open Live WhatsApp Notification Simulator/i);
    fireEvent.click(triggerBtn);

    const tokenQuickReply = screen.getByRole("button", { name: /🎟️ My Token/i });
    fireEvent.click(tokenQuickReply);

    expect(screen.getByText("Check my live token status")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText(/Live Queue Update/i)).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});
