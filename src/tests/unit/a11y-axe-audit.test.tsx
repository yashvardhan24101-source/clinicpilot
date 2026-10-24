import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { axe, toHaveNoViolations } from "jest-axe";
import { StatusPill } from "@/components/ui/status-pill";
import { Row } from "@/components/ui/row";
import { ConnectionBanner } from "@/components/layout/connection-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";

expect.extend(toHaveNoViolations);

describe("Group G: Automated Accessibility Audit (axe-core)", () => {
  it("StatusPill component has zero axe accessibility violations across all states", async () => {
    const { container } = render(
      <div>
        <StatusPill status="booked" />
        <StatusPill status="arrived" />
        <StatusPill status="completed" />
        <StatusPill status="no_show" />
        <StatusPill status="cancelled" />
        <StatusPill status="needs_staff" />
        <StatusPill status="bot_handling" />
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("Row component has zero axe accessibility violations when clickable and interactive", async () => {
    const { container } = render(
      <Row onClick={() => {}} aria-label="Appointment for Anita Verma at 10:30">
        <div>
          <span className="font-bold">Anita Verma</span>
          <span className="text-xs text-ink-soft">10:30 AM</span>
        </div>
      </Row>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("ConnectionBanner alert component has zero axe accessibility violations with aria-live", async () => {
    const { container } = render(
      <ConnectionBanner needsStaffCount={3} isOnline={false} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("InstallPrompt banner has zero axe accessibility violations", async () => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
      configurable: true,
    });
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(<InstallPrompt delayMs={0} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
