import { describe, it, expect } from "vitest";
import { metadata as dashboardMetadata } from "@/app/(dashboard)/layout";
import { metadata as offlineMetadata } from "@/app/offline/layout";

describe("Group G.2: Enforce noindex robots metadata (Rule G.2.5)", () => {
  it("verifies staff dashboard layout enforces noindex and nofollow", () => {
    expect(dashboardMetadata).toBeDefined();
    expect(dashboardMetadata.robots).toEqual({
      index: false,
      follow: false,
    });
  });

  it("verifies offline layout enforces noindex and nofollow", () => {
    expect(offlineMetadata).toBeDefined();
    expect(offlineMetadata.robots).toEqual({
      index: false,
      follow: false,
    });
  });
});
