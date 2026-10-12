import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { UpdateToast } from "@/components/pwa/update-toast";

describe("UpdateToast Component", () => {
  it("renders null by default when no new service worker update is pending", () => {
    const { container } = render(<UpdateToast />);
    expect(container.firstChild).toBeNull();
  });
});
