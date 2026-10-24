import { test, expect } from "@playwright/test";
import { createSignedTestToken } from "./test-auth-helper";

test.describe("ClinicPilot App Shell & Today Screen", () => {
  test("renders the app header with clinic name and live status", async ({ context, page, baseURL }) => {
    const token = await createSignedTestToken();
    const targetUrl = baseURL || "http://localhost:3000";

    await context.addCookies([
      {
        name: "clinicpilot_session",
        value: token,
        url: targetUrl,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/today");
    await expect(page.getByRole("heading", { name: "SmileCraft Dental" })).toBeVisible();
    await expect(page.getByText(/WhatsApp: not connected|WA Live/)).toBeVisible();
  });

  test("renders the bottom navigation on mobile viewport", async ({ context, page, baseURL }) => {
    const token = await createSignedTestToken();
    const targetUrl = baseURL || "http://localhost:3000";

    await context.addCookies([
      {
        name: "clinicpilot_session",
        value: token,
        url: targetUrl,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    await page.goto("/today");
    await expect(page.getByRole("link", { name: /today/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /inbox/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /patients/i })).toBeVisible();
  });
});
