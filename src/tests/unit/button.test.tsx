import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button Component", () => {
  it("renders with correct text and default signal styling", () => {
    render(<Button>Click Me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-signal");
  });

  it("renders disabled state properly", () => {
    render(<Button disabled>Disabled Action</Button>);
    const button = screen.getByRole("button", { name: /disabled action/i });
    expect(button).toBeDisabled();
  });

  it("renders secondary and pill variants", () => {
    const { rerender } = render(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-surface-2");

    rerender(<Button variant="pill">Filter Chip</Button>);
    expect(screen.getByRole("button")).toHaveClass("rounded-full");
  });
});
