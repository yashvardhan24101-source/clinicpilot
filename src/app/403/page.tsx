"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldAlert, ArrowLeft, LogIn, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

function ForbiddenContent() {
  const searchParams = useSearchParams();
  const path = searchParams.get("path") || "this resource";
  const role = searchParams.get("role") || "your current role";

  return (
    <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface-1 border border-line rounded-2xl p-6 sm:p-8 shadow-card text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-alert-subtle text-alert border border-alert/20">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-display text-ink">
            Access Restricted
          </h1>
          <p className="text-sm text-ink-soft">
            Your account ({role}) does not have permission to view{" "}
            <span className="font-mono text-xs bg-surface-2 px-1.5 py-0.5 rounded text-ink font-semibold">
              {path}
            </span>
            .
          </p>
        </div>

        <div className="p-3 bg-surface-2 rounded-xl text-xs text-ink-soft text-left border border-line-subtle space-y-1">
          <p className="font-semibold text-ink">Role Permissions Guide:</p>
          <ul className="list-disc list-inside space-y-0.5 text-ink-soft">
            <li>Receptionists: Today, Calendar, Appointments, Inbox, Patients, Follow-ups, Reports</li>
            <li>Doctors: Doctor Chamber, Today, Appointments, Reports</li>
            <li>Owners: Full access including Billing &amp; Subscriptions</li>
            <li>Super Admin: Platform management and system metrics</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link href="/today" className="flex-1">
            <Button variant="default" className="w-full">
              <Clock className="h-4 w-4 mr-2" />
              Today's Schedule
            </Button>
          </Link>
          <Link href="/login" className="flex-1">
            <Button variant="secondary" className="w-full">
              <LogIn className="h-4 w-4 mr-2" />
              Switch Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ForbiddenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-0 flex items-center justify-center">
          <p className="text-sm text-ink-soft font-display">Verifying permissions...</p>
        </div>
      }
    >
      <ForbiddenContent />
    </Suspense>
  );
}
