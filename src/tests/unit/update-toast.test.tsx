import React from "react";
import { render } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { UpdateToast, isUserTyping } from "@/components/pwa/update-toast";

describe("UpdateToast Component & Typing Safety", () => {
  let containerEl: HTMLDivElement;

  beforeEach(() => {
    containerEl = document.createElement("div");
    document.body.appendChild(containerEl);
  });

  afterEach(() => {
    document.body.removeChild(containerEl);
  });

  it("renders null by default when no new service worker update is pending", () => {
    const { container } = render(<UpdateToast />);
    expect(container.firstChild).toBeNull();
  });

  it("detects when user is actively typing in an input element", () => {
    const input = document.createElement("input");
    containerEl.appendChild(input);
    input.focus();

    expect(document.activeElement).toBe(input);
    expect(isUserTyping()).toBe(true);
  });

  it("detects when user is actively typing in a textarea element", () => {
    const textarea = document.createElement("textarea");
    containerEl.appendChild(textarea);
    textarea.focus();

    expect(document.activeElement).toBe(textarea);
    expect(isUserTyping()).toBe(true);
  });

  it("detects when user is typing in a contenteditable element", () => {
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    editable.setAttribute("tabindex", "0");
    containerEl.appendChild(editable);
    editable.focus();

    expect(isUserTyping()).toBe(true);
  });

  it("returns false when user is not focused on an input element", () => {
    const button = document.createElement("button");
    containerEl.appendChild(button);
    button.focus();

    expect(isUserTyping()).toBe(false);

    document.body.focus();
    expect(isUserTyping()).toBe(false);
  });
});
