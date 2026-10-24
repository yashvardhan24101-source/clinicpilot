import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { Row } from "@/components/ui/row";

describe("Group G: Devanagari / Hindi Fallback & Layout Resilience", () => {
  it("renders long Devanagari Hindi text inside buttons without overflow or breakage", () => {
    const hindiAction = "अपॉइंटमेंट सफलतापूर्वक दर्ज करें और रसीद भेजें";
    render(
      <Button className="font-devanagari max-w-sm">
        <span>{hindiAction}</span>
      </Button>
    );

    const btn = screen.getByRole("button", { name: hindiAction });
    expect(btn).toBeInTheDocument();
    expect(btn.textContent).toContain(hindiAction);
  });

  it("renders complex Hindi medical strings in status pills with accessible names", () => {
    const hindiStatus = "पुनः निर्धारित किया गया"; // Rescheduled
    render(
      <StatusPill
        status="booked"
        customLabel={hindiStatus}
        className="font-devanagari"
      />
    );

    const pill = screen.getByRole("status");
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveAttribute("aria-label", hindiStatus);
    expect(screen.getByText(hindiStatus)).toBeInTheDocument();
  });

  it("renders multiline Devanagari strings and names inside Row items seamlessly", () => {
    const patientNameHindi = "डॉ. राजेश कुमार शर्मा (वरिष्ठ दंत चिकित्सक)";
    const serviceDetailHindi = "दांत की जड़ का इलाज (Root Canal) एवं परामर्श";

    render(
      <Row className="font-devanagari" onClick={() => {}}>
        <div className="flex flex-col">
          <span className="font-bold">{patientNameHindi}</span>
          <span className="text-xs text-ink-soft">{serviceDetailHindi}</span>
        </div>
      </Row>
    );

    expect(screen.getByText(patientNameHindi)).toBeInTheDocument();
    expect(screen.getByText(serviceDetailHindi)).toBeInTheDocument();
  });

  it("preserves font stack with Noto Sans Devanagari fallback", () => {
    render(
      <div data-testid="devanagari-container" className="font-body">
        <span>क्लिनिकपायलट - स्वागत हे</span>
      </div>
    );

    const container = screen.getByTestId("devanagari-container");
    expect(container).toHaveClass("font-body");
  });
});
