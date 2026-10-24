import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Fix 1 & 2: Production Viewport & Theme Color Consistency", () => {
  const manifestPath = path.resolve(__dirname, "../../../public/manifest.webmanifest");
  const layoutPath = path.resolve(__dirname, "../../app/layout.tsx");

  it("ensures public/manifest.webmanifest uses #F5F8FB for both theme_color and background_color", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    expect(manifest.background_color).toBe("#F5F8FB");
    expect(manifest.theme_color).toBe("#F5F8FB");
  });

  it("ensures src/app/layout.tsx defines viewport with width=device-width, initialScale=1, themeColor=#F5F8FB, and NO maximum-scale / user-scalable", () => {
    const content = fs.readFileSync(layoutPath, "utf-8");

    // Must NOT contain maximumScale or maximum-scale
    expect(content.includes("maximumScale")).toBe(false);
    expect(content.includes("maximum-scale")).toBe(false);

    // Must NOT restrict user scalability
    expect(content.includes("userScalable")).toBe(false);
    expect(content.includes("user-scalable")).toBe(false);

    // Must define themeColor as #F5F8FB
    expect(content).toContain('themeColor: "#F5F8FB"');
    expect(content).toContain('width: "device-width"');
    expect(content).toContain("initialScale: 1");
  });

  it("inspects the rendered production HTML to guarantee viewport has no maximum-scale or user-scalable restriction and theme-color matches #F5F8FB", () => {
    const serverAppDir = path.resolve(__dirname, "../../../.next/server/app");
    if (!fs.existsSync(serverAppDir)) {
      // If build hasn't run yet in this environment, skip production HTML check
      return;
    }

    // Inspect all pre-rendered HTML files in .next/server/app
    const htmlFiles = fs
      .readdirSync(serverAppDir)
      .filter((file) => file.endsWith(".html"));

    expect(htmlFiles.length).toBeGreaterThan(0);

    for (const file of htmlFiles) {
      const html = fs.readFileSync(path.join(serverAppDir, file), "utf-8");

      // Verify viewport meta tag exists
      expect(html).toContain('name="viewport"');

      // Extract the viewport content attribute
      const viewportMatch = html.match(/<meta[^>]*name="viewport"[^>]*content="([^"]*)"/i);
      expect(viewportMatch).not.toBeNull();

      const viewportContent = viewportMatch![1];
      expect(viewportContent).toContain("width=device-width");
      expect(viewportContent).toContain("initial-scale=1");

      // STRICT REQUIREMENT: No maximum-scale anywhere in rendered viewport
      expect(viewportContent).not.toContain("maximum-scale");
      expect(viewportContent).not.toContain("user-scalable");

      // Verify theme-color is #F5F8FB
      const themeColorMatch = html.match(/<meta[^>]*name="theme-color"[^>]*content="([^"]*)"/i);
      expect(themeColorMatch).not.toBeNull();
      expect(themeColorMatch![1].toUpperCase()).toBe("#F5F8FB");
    }
  });
});
