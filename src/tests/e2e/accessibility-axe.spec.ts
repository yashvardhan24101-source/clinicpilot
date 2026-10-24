import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createSignedTestToken } from "./test-auth-helper";

test.describe("Group G.2: Page-Level Automated Accessibility Audit (Playwright + Axe-Core)", () => {
  test("Page /login has 0 serious or critical axe accessibility violations", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(200);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    if (seriousOrCritical.length > 0) {
      console.error(
        "Axe serious/critical violations on /login:",
        JSON.stringify(seriousOrCritical, null, 2)
      );
    }

    expect(seriousOrCritical).toEqual([]);
  });

  test("Page /today has 0 serious or critical axe accessibility violations (authenticated)", async ({
    context,
    page,
    baseURL,
  }) => {
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
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(200);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    if (seriousOrCritical.length > 0) {
      console.error(
        "Axe serious/critical violations on /today:",
        JSON.stringify(seriousOrCritical, null, 2)
      );
    }

    expect(seriousOrCritical).toEqual([]);
  });

  test("Page /inbox has 0 serious or critical axe accessibility violations (authenticated)", async ({
    context,
    page,
    baseURL,
  }) => {
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

    await page.goto("/inbox");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(200);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    if (seriousOrCritical.length > 0) {
      console.error(
        "Axe serious/critical violations on /inbox:",
        JSON.stringify(seriousOrCritical, null, 2)
      );
    }

    expect(seriousOrCritical).toEqual([]);
  });

  test("Page /patients has 0 serious or critical axe accessibility violations (authenticated)", async ({
    context,
    page,
    baseURL,
  }) => {
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

    await page.goto("/patients");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(200);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical"
    );

    if (seriousOrCritical.length > 0) {
      console.error(
        "Axe serious/critical violations on /patients:",
        JSON.stringify(seriousOrCritical, null, 2)
      );
    }

    expect(seriousOrCritical).toEqual([]);
  });
});
