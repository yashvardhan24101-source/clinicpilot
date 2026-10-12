import { test, expect } from "@playwright/test";

test.describe("ClinicPilot App Shell & Today Screen", () => {
  test("renders the app header with clinic name and live status", async ({ page }) => {
    await page.goto("/today");
    await expect(page.getByText("SmileCraft Dental Clinic")).toBeVisible();
    await expect(page.getByText("WA Live")).toBeVisible();
  });

  test("renders the bottom navigation on mobile viewport", async ({ page }) => {
    await page.goto("/today");
    await expect(page.getByRole("link", { name: /today/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /inbox/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /patients/i })).toBeVisible();
  });
});
