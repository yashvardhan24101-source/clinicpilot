"use client";

import React from "react";
import Link from "next/link";
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
  HeartPulse,
  ArrowRight,
} from "lucide-react";
import { Row } from "@/components/ui/row";

export default function MorePage() {
  const sections = [
    {
      title: "Clinic Operations",
      items: [
        { label: "Doctor Chamber & Queue", href: "/doctor", icon: Stethoscope, badge: "Chamber 1" },
        { label: "Follow-ups & Recalls", href: "/followups", icon: BellRing, badge: "5 Due" },
        { label: "Lab Reports & PDFs", href: "/reports", icon: FileText },
        { label: "Services & Pricing", href: "/more#services", icon: Stethoscope },
        { label: "Clinic FAQ & Auto-Replies", href: "/more#faq", icon: HelpCircle },
      ],
    },
    {
      title: "Management & Billing",
      items: [
        { label: "Staff & Doctors", href: "/more#staff", icon: Settings },
        { label: "Plan & Razorpay Billing", href: "/billing", icon: CreditCard },
        { label: "Super Admin Area", href: "/admin", icon: Shield, badge: "Role gated" },
      ],
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-ink font-display">
          More Operations
        </h2>
        <p className="text-xs text-ink-soft">
          Clinic configuration, billing, and lab report management
        </p>
      </div>

      {/* Switch to Patient Portal Card */}
      <Link
        href="/patient"
        className="flex items-center justify-between p-4 rounded-2xl border border-signal/25 bg-signal/10 hover:bg-signal/15 transition-all group shadow-2xs"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-signal text-white shadow-xs">
            <HeartPulse className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink font-display">
              Switch to Patient Portal
            </h3>
            <p className="text-xs text-ink-soft">
              Browse clinic doctors &amp; test online appointment booking
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-signal transition-transform group-hover:translate-x-1" />
      </Link>

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
        <button className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-alert/30 bg-alert-subtle text-alert-foreground text-sm font-semibold hover:bg-alert-subtle/80 transition-colors">
          <LogOut className="h-4 w-4" />
          <span>Log out from ClinicPilot</span>
        </button>
      </div>
    </div>
  );
}
