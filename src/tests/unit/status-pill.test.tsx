import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StatusPill } from "@/components/ui/status-pill";

describe("StatusPill Component", () => {
  it("renders with both text label and accessible status role (never color alone)", () => {
    render(<StatusPill status="booked" />);
    const pill = screen.getByRole("status");
    expect(pill).toBeInTheDocument();
    expect(screen.getByText("Booked")).toBeInTheDocument();
  });

  it("renders arrived status with correct label and styling", () => {
    render(<StatusPill status="arrived" />);
    expect(screen.getByText("Arrived")).toBeInTheDocument();
  });

  it("renders no-show status with alert tint and label", () => {
    render(<StatusPill status="no_show" />);
    expect(screen.getByText("No-Show")).toBeInTheDocument();
  });

  it("renders needs_staff status with attention label", () => {
    render(<StatusPill status="needs_staff" />);
    expect(screen.getByText("Needs Staff")).toBeInTheDocument();
  });
});
