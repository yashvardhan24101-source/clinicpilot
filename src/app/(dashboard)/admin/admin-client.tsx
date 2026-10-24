"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Building2,
  Users,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Row } from "@/components/ui/row";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function AdminClient() {
  const { user, login } = useAuth();
  const [roleSwitchSuccess, setRoleSwitchSuccess] = useState<string | null>(null);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["admin-metrics"],
    queryFn: () => api.getAdminMetrics(),
    enabled: Boolean(user?.role === "super_admin" || user?.role === "owner"),
  });

  const isAuthorized = user?.role === "super_admin" || user?.role === "owner";

  const handleSimulateOwnerLogin = async () => {
    await login({ email: "owner@smilecraft.in", password: "demo" });
    setRoleSwitchSuccess("Switched to Owner session. Access granted.");
    setTimeout(() => setRoleSwitchSuccess(null), 4000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2 text-ink-soft text-xs font-semibold uppercase tracking-wider font-display">
          <Shield className="h-3.5 w-3.5 text-signal" />
          <span>Platform Multi-Tenant Governance</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-ink font-display mt-0.5">
          Super Admin Console
        </h2>
        <p className="text-xs text-ink-soft mt-1">
          Multi-clinic operations, WhatsApp Meta throughput &amp; billing metrics
        </p>
      </div>

      {roleSwitchSuccess && (
        <div className="p-3 rounded-xl bg-ok-subtle border border-ok/30 text-xs font-semibold text-ok flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" />
          <span>{roleSwitchSuccess}</span>
        </div>
      )}

      {/* Access Gate Warning for Non-Admins */}
      {!isAuthorized ? (
        <div className="bg-surface-1 rounded-2xl border border-line p-8 text-center space-y-4 shadow-subtle max-w-lg mx-auto">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-alert-subtle text-alert">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink font-display">
              Role-Gated Area
            </h3>
            <p className="text-xs text-ink-soft mt-1 max-w-sm mx-auto">
              You are currently logged in as <strong>{user?.name || "Staff"}</strong> with role{" "}
              <code className="text-signal">{user?.role || "receptionist"}</code>. Super Admin console is restricted to Clinic Owners and Super Admins.
            </p>
          </div>

          <Button onClick={handleSimulateOwnerLogin} className="gap-2 mx-auto">
            <Sparkles className="h-4 w-4" />
            <span>Switch to Clinic Owner Role (Demo)</span>
          </Button>
        </div>
      ) : (
        /* Authorized Super Admin Metrics View */
        <div className="space-y-6">
          {/* Key Metric Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-surface-1 rounded-xl p-4 border border-line shadow-subtle">
              <div className="flex items-center justify-between text-xs text-ink-soft">
                <span>Total Clinics</span>
                <Building2 className="h-4 w-4 text-signal" />
              </div>
              <div className="mt-2 text-2xl font-bold text-ink font-display tabular-nums">
                {metrics?.total_clinics || 14}
              </div>
              <p className="text-[10px] text-ink-faint mt-1">Across 3 metro cities</p>
            </div>

            <div className="bg-surface-1 rounded-xl p-4 border border-line shadow-subtle">
              <div className="flex items-center justify-between text-xs text-ink-soft">
                <span>Active Doctors</span>
                <Users className="h-4 w-4 text-ok" />
              </div>
              <div className="mt-2 text-2xl font-bold text-ink font-display tabular-nums">
                {metrics?.active_doctors || 28}
              </div>
              <p className="text-[10px] text-ink-faint mt-1">Dentists &amp; specialists</p>
            </div>

            <div className="bg-surface-1 rounded-xl p-4 border border-line shadow-subtle">
              <div className="flex items-center justify-between text-xs text-ink-soft">
                <span>WA Messages / Mo</span>
                <MessageSquare className="h-4 w-4 text-signal" />
              </div>
              <div className="mt-2 text-2xl font-bold text-ink font-display tabular-nums">
                {metrics?.whatsapp_messages_month?.toLocaleString() || "9,840"}
              </div>
              <p className="text-[10px] text-ok mt-1">99.8% Meta delivery rate</p>
            </div>

            <div className="bg-surface-1 rounded-xl p-4 border border-line shadow-subtle">
              <div className="flex items-center justify-between text-xs text-ink-soft">
                <span>Monthly MRR</span>
                <TrendingUp className="h-4 w-4 text-ok" />
              </div>
              <div className="mt-2 text-2xl font-bold text-ink font-display tabular-nums">
                ₹{metrics?.active_mrr_inr?.toLocaleString() || "58,986"}
              </div>
              <p className="text-[10px] text-ink-faint mt-1">Active billing</p>
            </div>
          </div>

          {/* Clinics Multi-Tenant Directory */}
          <div className="bg-surface-1 rounded-2xl border border-line shadow-subtle overflow-hidden">
            <div className="px-4 py-3 border-b border-line-subtle bg-surface-2/30 flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink font-display">
                Multi-Branch Clinic Tenancy
              </h3>
              <span className="text-xs text-ink-soft">
                {metrics?.clinics?.length || 4} Branches Connected
              </span>
            </div>

            <div className="divide-y divide-line-subtle">
              {metrics?.clinics?.map((c: any) => (
                <Row key={c.id} className="hover:bg-surface-2/60">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal-subtle text-signal font-bold">
                      <Building2 className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-ink truncate">{c.name}</h4>
                        <span className="px-2 py-0.2 rounded-md bg-surface-2 text-[10px] font-semibold text-ink-soft uppercase font-display">
                          {c.city}
                        </span>
                      </div>
                      <p className="text-xs text-ink-soft mt-0.5">
                        {c.doctors} Doctor Seats • Tier: <strong className="text-ink">{c.plan}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-ok-subtle text-ok border border-ok/30 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{c.status}</span>
                    </span>
                  </div>
                </Row>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
