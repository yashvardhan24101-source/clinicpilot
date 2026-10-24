import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { MOCK_PLANS } from "@/mocks/seed-data";

declare global {
  // eslint-disable-next-line no-var
  var __clinicpilot_subscriptions__: Record<string, any> | undefined;
}

const subscriptions: Record<string, any> =
  global.__clinicpilot_subscriptions__ ||
  (global.__clinicpilot_subscriptions__ = {});

export async function POST(request: Request) {
  const auth = await requireRole(["owner", "super_admin"], request);
  if (auth.errorResponse) return auth.errorResponse;

  const session = auth.session;
  const clinicId = session.clinic_id;

  const { plan_id } = (await request.json()) as { plan_id?: string };
  const targetPlan = MOCK_PLANS.find((p) => p.id === plan_id);

  if (!targetPlan) {
    return NextResponse.json(
      { error: "Invalid plan selected" },
      { status: 400 }
    );
  }

  const updatedSub = {
    plan_id: targetPlan.id,
    plan_name: targetPlan.name,
    status: "active",
    amount: targetPlan.price,
    currency: "INR",
    updated_at: new Date().toISOString(),
  };

  const effectiveClinicId = clinicId || "cln-1";
  subscriptions[effectiveClinicId] = updatedSub;

  return NextResponse.json({
    status: "subscribed",
    razorpay_payment_id: `pay_${Date.now()}`,
    subscription: updatedSub,
  });
}
