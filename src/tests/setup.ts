import "@testing-library/jest-dom";

// Mock HTMLElement.prototype.scrollIntoView for JSDOM
if (typeof window !== "undefined" && window.HTMLElement) {
  window.HTMLElement.prototype.scrollIntoView = () => {};
}
