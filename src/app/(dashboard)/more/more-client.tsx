"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellRing,
  FileText,
  Settings,
  CreditCard,
  Stethoscope,
  HelpCircle,
  Shield,
  ChevronRight,
  LogOut,
  UserCheck,
} from "lucide-react";
import { Row } from "@/components/ui/row";
import { useAuth } from "@/lib/auth-context";
import { isRouteAllowed } from "@/lib/roles";
import { FeatureFlags } from "@/lib/flags";

export interface MoreClientProps {
  flags?: FeatureFlags;
}

export default function MoreClient({ flags }: MoreClientProps) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const currentRole = user?.role || "receptionist";

  const rawSections = [
    {
      title: "Clinic Operations",
      items: [
        { label: "Doctor Chamber", href: "/doctor", icon: Stethoscope },
        { label: "Follow-ups & Recalls", href: "/followups", icon: BellRing, badge: "5 Due" },
        { label: "Lab Reports & PDFs", href: "/reports", icon: FileText },
        { label: "Services & Pricing", href: "/more#services", icon: Stethoscope },
        { label: "Clinic FAQ & Auto-Replies", href: "/more#faq", icon: HelpCircle },
      ],
    },
    {
      title: "Management & Billing",
      items: [
        { label: "Staff Directory", href: "/more#staff", icon: Settings },
        { label: "Billing", href: "/billing", icon: CreditCard },
        { label: "Super Admin Area", href: "/admin", icon: Shield, badge: "Role gated" },
      ],
    },
  ];

  // Feature Flag & RBAC filter:
  // Hide Doctor Chamber if flag is off; Receptionists never see Super Admin or Billing
  const sections = rawSections
    .map((sec) => ({
      ...sec,
      items: sec.items.filter((item) => {
        if (item.href === "/doctor" && !flags?.doctorChamber) return false;
        if (item.href.startsWith("/#") || item.href.includes("#")) return true;
        return isRouteAllowed(currentRole, item.href);
      }),
    }))
    .filter((sec) => sec.items.length > 0);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink font-display">
            More Operations
          </h2>
          <p className="text-xs text-ink-soft">
            Clinic configuration, billing, and lab report management
          </p>
        </div>
        {user && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-2 border border-line-subtle text-xs">
            <UserCheck className="h-4 w-4 text-signal" />
            <div>
              <span className="font-semibold text-ink block">{user.name}</span>
              <span className="text-[10px] text-ink-faint uppercase font-display">{user.role}</span>
            </div>
          </div>
        )}
      </div>

      {sections.map((sec) => (
        <div key={sec.title} className="space-y-2">
          <span className="text-xs font-semibold text-ink-faint uppercase tracking-wider font-display px-1">
            {sec.title}
          </span>
          <div className="bg-surface-1 rounded-2xl border border-line shadow-subtle overflow-hidden divide-y divide-line-subtle">
            {sec.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} href={item.href} className="block">
                  <Row className="hover:bg-surface-2/60 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-ink-soft">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold text-ink">
                        {item.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-signal-subtle text-signal text-xs font-bold font-display">
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-ink-faint" />
                    </div>
                  </Row>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Logout button */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-alert/30 bg-alert-subtle text-alert-foreground text-sm font-semibold hover:bg-alert-subtle/80 transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Log out from ClinicPilot</span>
        </button>
      </div>
    </div>
  );
}
