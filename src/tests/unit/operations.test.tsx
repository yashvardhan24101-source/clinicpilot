import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { KeyboardShortcutsDialog } from "@/components/layout/keyboard-shortcuts-dialog";

// Mock next/navigation useRouter
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("Milestone 7 Operations & Keyboard Shortcuts", () => {
  it("renders keyboard shortcut trigger button and opens modal on click", () => {
    render(<KeyboardShortcutsDialog />);

    const triggerBtn = screen.getByRole("button", { name: /keyboard shortcuts/i });
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);
    expect(screen.getByText("Keyboard Shortcuts & Quick Jump")).toBeInTheDocument();
    expect(screen.getByText("Today Schedule & Time Rail")).toBeInTheDocument();
    expect(screen.getByText("Lab Reports & PDFs")).toBeInTheDocument();
    expect(screen.getByText("Billing")).toBeInTheDocument();
  });

  it("navigates to route when shortcut item is clicked", () => {
    render(<KeyboardShortcutsDialog />);

    const triggerBtn = screen.getByRole("button", { name: /keyboard shortcuts/i });
    fireEvent.click(triggerBtn);

    const reportsBtn = screen.getByText("Lab Reports & PDFs");
    fireEvent.click(reportsBtn);

    expect(mockPush).toHaveBeenCalledWith("/reports");
  });

  it("verifies Patient Portal shortcut is removed from staff shortcuts dialog (Rule Group D)", () => {
    render(<KeyboardShortcutsDialog />);

    const triggerBtn = screen.getByRole("button", { name: /keyboard shortcuts/i });
    fireEvent.click(triggerBtn);

    expect(screen.queryByText(/Patient Portal/i)).toBeNull();
  });
});
