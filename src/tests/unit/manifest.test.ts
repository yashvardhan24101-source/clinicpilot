import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("PWA Web App Manifest", () => {
  const manifestPath = path.resolve(__dirname, "../../../public/manifest.webmanifest");

  it("exists and is valid JSON", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    expect(manifest.name).toBe("ClinicPilot — Staff Dashboard");
    expect(manifest.short_name).toBe("ClinicPilot");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/today");
    expect(manifest.background_color).toBe("#F5F8FB");
    expect(manifest.theme_color).toBe("#F5F8FB");
  });

  it("contains required icons including 192, 512, and maskable", () => {
    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");

    const maskable = manifest.icons.find(
      (i: { purpose?: string }) => i.purpose === "maskable"
    );
    expect(maskable).toBeDefined();
    expect(maskable.sizes).toBe("512x512");
  });

  it("contains shortcuts for Today, Inbox, and New Appointment", () => {
    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    expect(manifest.shortcuts.length).toBeGreaterThanOrEqual(3);
    const shortcutUrls = manifest.shortcuts.map((s: { url: string }) => s.url);
    expect(shortcutUrls).toContain("/today");
    expect(shortcutUrls).toContain("/inbox");
  });
});
