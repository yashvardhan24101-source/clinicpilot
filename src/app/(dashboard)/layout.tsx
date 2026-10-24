import React from "react";
import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { ConnectionBanner } from "@/components/layout/connection-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { UpdateToast } from "@/components/pwa/update-toast";
import { KeyboardShortcutsDialog } from "@/components/layout/keyboard-shortcuts-dialog";
import { getFeatureFlags } from "@/lib/flags";
import { requirePageSession } from "@/lib/auth-guard";

// Rule G.2.5: Enforce noindex / nofollow robots metadata on all staff routes
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageSession();
  const flags = getFeatureFlags();
  const isDemo =
    process.env.DEMO_MODE === "true" || process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const unreadCount = isDemo ? 2 : 0;

  return (
    <div className="flex min-h-screen bg-surface-0">
      {/* Desktop Sidebar (visible on >=1024px) */}
      <DesktopSidebar unreadInboxCount={unreadCount} flags={flags} />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader needsStaffCount={unreadCount} />
        <ConnectionBanner needsStaffCount={unreadCount} />

        {/* Content View with bottom safe area on mobile */}
        <main className="flex-1 pb-24 lg:pb-8">{children}</main>

        {/* PWA Floating Utilities */}
        <KeyboardShortcutsDialog />

        {/* Mobile Bottom Tab Bar (visible on <1024px) */}
        <BottomNav unreadInboxCount={unreadCount} />
      </div>
    </div>
  );
}
