import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AppHeader } from "@/components/layout/app-header";
import InboxPage from "@/app/(dashboard)/inbox/page";
import { GET as getConversations } from "@/app/api/conversations/route";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as AuthContext from "@/lib/auth-context";
import { SignJWT } from "jose";

describe("Group G.2 - WhatsApp Status Indicator & Inbox Gating (Rule G.2.2)", () => {
  const originalDemoMode = process.env.DEMO_MODE;
  const originalNextPublicDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.DEMO_MODE = originalDemoMode;
    process.env.NEXT_PUBLIC_DEMO_MODE = originalNextPublicDemoMode;
  });

  describe("WhatsApp Status Indicator in AppHeader", () => {
    it("renders 'WhatsApp: not connected' in production mode (DEMO_MODE=false)", () => {
      process.env.DEMO_MODE = "false";
      process.env.NEXT_PUBLIC_DEMO_MODE = "false";

      render(<AppHeader />);

      expect(screen.getByText("WhatsApp: not connected")).toBeInTheDocument();
      expect(screen.queryByText("WA Live")).not.toBeInTheDocument();
      expect(screen.queryByText("WA Disconnected")).not.toBeInTheDocument();
    });

    it("renders 'WA Live' only in demo mode (DEMO_MODE=true)", () => {
      process.env.DEMO_MODE = "true";
      process.env.NEXT_PUBLIC_DEMO_MODE = "true";

      render(<AppHeader />);

      expect(screen.getByText("WA Live")).toBeInTheDocument();
      expect(screen.queryByText("WhatsApp: not connected")).not.toBeInTheDocument();
    });
  });

  describe("API /api/conversations Gating", () => {
    async function makeTestToken(role = "receptionist", clinicId = "cln-1") {
      const secret = process.env.SESSION_SECRET || "dev-clinicpilot-secret-32-chars-long-local-jwt";
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
      );
      return await new SignJWT({
        user_id: "usr-test-1",
        name: "Test Staff",
        email: "staff@clinic.in",
        role,
        clinic_id: clinicId,
        clinic_name: "Test Clinic",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(key);
    }

    it("returns empty array in production mode (DEMO_MODE=false) withholding mock fixtures", async () => {
      process.env.DEMO_MODE = "false";
      process.env.NEXT_PUBLIC_DEMO_MODE = "false";

      const token = await makeTestToken("receptionist", "cln-1");
      const req = new Request("http://localhost:3000/api/conversations", {
        headers: {
          cookie: `clinicpilot_session=${token}`,
        },
      });

      const res = await getConversations(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual([]);
    });

    it("returns mock fixture conversations in demo mode (DEMO_MODE=true)", async () => {
      process.env.DEMO_MODE = "true";
      process.env.NEXT_PUBLIC_DEMO_MODE = "true";

      const token = await makeTestToken("receptionist", "cln-1");
      const req = new Request("http://localhost:3000/api/conversations", {
        headers: {
          cookie: `clinicpilot_session=${token}`,
        },
      });

      const res = await getConversations(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });
  });

  describe("Inbox Page UI Empty State", () => {
    it("renders required copy 'No conversations yet. Connect WhatsApp to start receiving messages.' when empty", async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      });

      // Mock api.getConversations to return empty array
      vi.mock("@/lib/api", () => ({
        api: {
          getConversations: vi.fn().mockResolvedValue([]),
        },
      }));

      render(
        <QueryClientProvider client={queryClient}>
          <InboxPage />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(
          screen.getAllByText("No conversations yet. Connect WhatsApp to start receiving messages.")
        ).not.toHaveLength(0);
      });
    });
  });
});
