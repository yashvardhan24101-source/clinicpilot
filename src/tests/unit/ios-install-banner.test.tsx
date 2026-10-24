import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { InstallPrompt } from "@/components/pwa/install-prompt";

describe("iOS Safari 'Add to Home Screen' In-App Help Card", () => {
  const originalUserAgent = navigator.userAgent;
  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();

    matchMediaMock = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;

    delete (window.navigator as any).standalone;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUserAgent,
      configurable: true,
    });
  });

  it("shows in-app 'Add to Home Screen' help card for iPhone Safari users when not in standalone mode", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      configurable: true,
    });

    render(<InstallPrompt delayMs={0} />);

    await waitFor(() => {
      expect(screen.getByTestId("ios-install-banner")).toBeInTheDocument();
    });

    // Verify Share icon and instructions
    expect(
      screen.getByRole("heading", { name: /Add to Home Screen/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/iPhone/i)).toBeInTheDocument();
    expect(screen.getByText(/Tap the/i)).toBeInTheDocument();
    expect(screen.getByText(/Share/i)).toBeInTheDocument();
    expect(screen.getByText(/"Add to Home Screen"/i)).toBeInTheDocument();
  });

  it("dismisses the iOS card on 'Got it' click and persists dismissal to localStorage", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      configurable: true,
    });

    render(<InstallPrompt delayMs={0} />);

    await waitFor(() => {
      expect(screen.getByTestId("ios-install-banner")).toBeInTheDocument();
    });

    const gotItBtn = screen.getByRole("button", { name: /Got it/i });
    fireEvent.click(gotItBtn);

    expect(screen.queryByTestId("ios-install-banner")).not.toBeInTheDocument();
    expect(localStorage.getItem("clinicpilot_ios_install_dismissed")).toBe("true");
  });

  it("does not render when running in iOS standalone mode", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      configurable: true,
    });

    // Simulate standalone display mode
    (window.navigator as any).standalone = true;

    render(<InstallPrompt delayMs={0} />);

    expect(screen.queryByTestId("ios-install-banner")).not.toBeInTheDocument();
  });

  it("does not render if previously dismissed in localStorage", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      configurable: true,
    });

    localStorage.setItem("clinicpilot_ios_install_dismissed", "true");

    render(<InstallPrompt delayMs={0} />);

    expect(screen.queryByTestId("ios-install-banner")).not.toBeInTheDocument();
  });
});
