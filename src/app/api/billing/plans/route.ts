import { NextResponse } from "next/server";
import { MOCK_PLANS } from "@/mocks/seed-data";
import { requireRole } from "@/lib/auth-guard";

declare global {
  // eslint-disable-next-line no-var
  var __clinicpilot_subscriptions__: Record<string, any> | undefined;
}

const subscriptions: Record<string, any> =
  global.__clinicpilot_subscriptions__ ||
  (global.__clinicpilot_subscriptions__ = {
    "cln-1": {
      plan_id: "plan-growth",
      plan_name: "Growth Clinic",
      status: "active",
      next_billing_date: "2026-11-12",
      amount: 1499,
      currency: "INR",
    },
    "cln-2": {
      plan_id: "plan-starter",
      plan_name: "Starter Clinic",
      status: "active",
      next_billing_date: "2026-11-01",
      amount: 499,
      currency: "INR",
    },
  });

export async function GET(request: Request) {
  const auth = await requireRole(["owner", "super_admin"], request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;

  const effectiveClinicId = clinicId || "cln-1";
  const clinicSub = subscriptions[effectiveClinicId] || {
    plan_id: "plan-starter",
    plan_name: "Starter Clinic",
    status: "active",
    next_billing_date: "2026-11-01",
    amount: 499,
    currency: "INR",
  };

  return NextResponse.json({
    plans: MOCK_PLANS,
    subscription: clinicSub,
  });
}
