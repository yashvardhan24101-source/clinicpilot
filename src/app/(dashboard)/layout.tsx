import React from "react";
import { AppHeader } from "@/components/layout/app-header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DesktopSidebar } from "@/components/layout/desktop-sidebar";
import { ConnectionBanner } from "@/components/layout/connection-banner";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { UpdateToast } from "@/components/pwa/update-toast";
import { KeyboardShortcutsDialog } from "@/components/layout/keyboard-shortcuts-dialog";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface-0">
      {/* Desktop Sidebar (visible on >=1024px) */}
      <DesktopSidebar unreadInboxCount={2} />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader needsStaffCount={2} />
        <ConnectionBanner needsStaffCount={2} />

        {/* Content View with bottom safe area on mobile */}
        <main className="flex-1 pb-24 lg:pb-8">{children}</main>

        {/* PWA Floating Utilities */}
        <InstallPrompt />
        <UpdateToast />
        <KeyboardShortcutsDialog />

        {/* Mobile Bottom Tab Bar (visible on <1024px) */}
        <BottomNav unreadInboxCount={2} />
      </div>
    </div>
  );
}
