"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  CalendarDays,
  CalendarRange,
  MessageSquare,
  Users,
  BellRing,
  FileText,
  CreditCard,
  Shield,
  Sparkles,
  Stethoscope,
  ChevronRight,
  HeartPulse,
  ArrowRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { isRouteAllowed } from "@/lib/roles";
import { FeatureFlags } from "@/lib/flags";

interface DesktopSidebarProps {
  unreadInboxCount?: number;
  flags?: FeatureFlags;
}

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  unreadInboxCount = 2,
  flags,
}) => {
  const pathname = usePathname();
  const { user } = useAuth();
  const currentRole = user?.role || "receptionist";

  const allMainLinks = [
    { href: "/today", label: "Today", icon: Clock },
    { href: "/doctor", label: "Doctor Chamber", icon: Stethoscope },
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/appointments", label: "Appointments", icon: CalendarRange },
    {
      href: "/inbox",
      label: "Inbox",
      icon: MessageSquare,
      badge: unreadInboxCount,
    },
    { href: "/patients", label: "Patients", icon: Users },
  ];

  const allSecondaryLinks = [
    { href: "/followups", label: "Follow-ups & Recalls", icon: BellRing },
    { href: "/reports", label: "Lab Reports & PDFs", icon: FileText },
    { href: "/billing", label: "Billing", icon: CreditCard },
    { href: "/admin", label: "Super Admin", icon: Shield },
  ];

  // Feature Flag Filtering: Hide Doctor Chamber if feature flag is off
  const flagFilteredMain = allMainLinks.filter((link) => {
    if (link.href === "/doctor" && !flags?.doctorChamber) {
      return false;
    }
    return true;
  });

  // RBAC Filtering: Receptionists never see Super Admin or Billing
  const mainLinks = flagFilteredMain.filter((link) => isRouteAllowed(currentRole, link.href));
  const secondaryLinks = allSecondaryLinks.filter((link) => isRouteAllowed(currentRole, link.href));

  const initials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase()
    : "ST";

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-line bg-surface-1 h-screen sticky top-0 select-none shrink-0">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 h-16 border-b border-line-subtle">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal text-white shadow-sm shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <span className="block text-xs font-semibold text-signal uppercase tracking-wider font-display leading-none">
            ClinicPilot
          </span>
          <span className="text-sm font-bold text-ink">Staff Panel</span>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        <div>
          <span className="px-3 text-[11px] font-semibold text-ink-faint uppercase tracking-wider font-display">
            Workspace
          </span>
          <nav className="mt-2 space-y-1">
            {mainLinks.map((link) => {
              const isActive =
                link.href === "/today"
                  ? pathname === "/today"
                  : pathname.startsWith(link.href);
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    isActive
                      ? "bg-signal-subtle text-signal font-semibold"
                      : "text-ink-soft hover:bg-surface-2 hover:text-ink"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </div>
                  {link.badge && link.badge > 0 ? (
                    <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-alert text-[10px] font-bold text-white font-display">
                      {link.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        {secondaryLinks.length > 0 && (
          <div>
            <span className="px-3 text-[11px] font-semibold text-ink-faint uppercase tracking-wider font-display">
              Management
            </span>
            <nav className="mt-2 space-y-1">
              {secondaryLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                const Icon = link.icon;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive
                        ? "bg-signal-subtle text-signal font-semibold"
                        : "text-ink-soft hover:bg-surface-2 hover:text-ink"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* Staff User Card */}
      <div className="p-4 border-t border-line-subtle">
        <Link
          href="/more"
          className="flex items-center justify-between p-2 rounded-xl hover:bg-surface-2 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 ring-1 ring-line">
              <AvatarFallback className="bg-signal-subtle text-signal font-semibold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink truncate leading-tight">
                {user?.name || "Staff Member"}
              </p>
              <p className="text-xs text-ink-soft truncate">
                {user?.clinic_name || "Clinic"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-ink-faint" />
        </Link>
      </div>
    </aside>
  );
};
