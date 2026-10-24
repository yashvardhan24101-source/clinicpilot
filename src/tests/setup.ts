import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock next/font/google for component/layout tests
vi.mock("next/font/google", () => ({
  Figtree: () => ({
    variable: "--font-figtree",
    className: "font-figtree",
  }),
  Sora: () => ({
    variable: "--font-sora",
    className: "font-sora",
  }),
  Noto_Sans_Devanagari: () => ({
    variable: "--font-noto-devanagari",
    className: "font-noto-devanagari",
  }),
}));

// Mock HTMLElement.prototype.scrollIntoView for JSDOM
if (typeof window !== "undefined" && window.HTMLElement) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}
