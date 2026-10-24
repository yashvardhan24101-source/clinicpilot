"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Clock,
  HelpCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDateDisplay } from "@/lib/utils";
import { BillingPlan } from "@/types/api";

export default function BillingClient() {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["billing-plans"],
    queryFn: () => api.getBillingPlans(),
  });

  const plans = data?.plans || [];
  const subscription = data?.subscription;

  const subscribeMutation = useMutation({
    mutationFn: (planId: string) => api.subscribePlan(planId),
    onSuccess: (res) => {
      setIsProcessing(false);
      setPaymentSuccess(
        `Payment successful via Razorpay Test Mode! Reference: ${res.razorpay_payment_id}. Plan activated.`
      );
      queryClient.invalidateQueries({ queryKey: ["billing-plans"] });
      setTimeout(() => setPaymentSuccess(null), 7000);
    },
  });

  const handlePayRazorpay = (plan: BillingPlan) => {
    setIsProcessing(true);
    // Simulate Razorpay popup processing delay
    setTimeout(() => {
      subscribeMutation.mutate(plan.id);
    }, 1200);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-6">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2 text-ink-soft text-xs font-semibold uppercase tracking-wider font-display">
          <CreditCard className="h-3.5 w-3.5 text-signal" />
          <span>Subscription &amp; Payments</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-ink font-display mt-0.5">
          Clinic Plans &amp; Billing
        </h2>
        <p className="text-xs text-ink-soft mt-1">
          Automated WhatsApp reception, doctor seats, and recall reminders
        </p>
      </div>

      {/* Payment Success Alert */}
      {paymentSuccess && (
        <div className="p-4 rounded-2xl bg-ok-subtle border border-ok/30 text-xs font-semibold text-ok flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-ok" />
          <span>{paymentSuccess}</span>
        </div>
      )}

      {/* Current Active Plan Status Banner */}
      {subscription && (
        <div className="p-4 rounded-2xl bg-surface-1 border border-line shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-signal-subtle text-signal shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-ink-soft uppercase font-display tracking-wider">
                  Active Subscription
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-ok-subtle text-ok border border-ok/20">
                  {subscription.status.toUpperCase()}
                </span>
              </div>
              <h3 className="text-base font-bold text-ink font-display">
                {subscription.plan_name}
              </h3>
            </div>
          </div>

          <div className="text-xs text-ink-soft sm:text-right">
            <span>Next billing cycle renews on </span>
            <strong className="text-ink font-display">{formatDateDisplay(subscription.renews_at)}</strong>
            <p className="text-[11px] text-ink-faint">Secure Gateway Auto-debit</p>
          </div>
        </div>
      )}

      {/* Plans Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrent = subscription?.plan_id === plan.id;

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-all relative ${
                plan.recommended
                  ? "bg-surface-1 border-signal shadow-md ring-1 ring-signal/30"
                  : "bg-surface-1 border-line shadow-subtle hover:border-line/80"
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-signal text-white text-[10px] font-bold uppercase tracking-wider font-display shadow-sm">
                  Most Popular
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-ink font-display">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-ink font-display tabular-nums">
                      ₹{plan.price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-xs text-ink-soft">/ month + GST</span>
                  </div>
                </div>

                <div className="h-px bg-line-subtle" />

                {/* Features List */}
                <div className="space-y-2.5 text-xs text-ink-soft">
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-ok shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6">
                {isCurrent ? (
                  <Button
                    variant="outline"
                    className="w-full text-xs font-semibold cursor-default bg-surface-2/60 border-line text-ink-soft"
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePayRazorpay(plan)}
                    disabled={isProcessing}
                    className="w-full gap-2 shadow-sm text-xs font-semibold"
                    variant={plan.recommended ? "default" : "outline"}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>
                      {isProcessing ? "Processing..." : `Upgrade Plan (₹${plan.price})`}
                    </span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trust & Meta Cloud Notice */}
      <div className="p-4 rounded-2xl bg-surface-2/40 border border-line-subtle text-xs text-ink-soft space-y-1">
        <div className="flex items-center gap-2 font-semibold text-ink">
          <ShieldCheck className="h-4 w-4 text-signal" />
          <span>Meta Cloud API &amp; Secure Billing Compliant</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          ClinicPilot uses official Meta WhatsApp Cloud API infrastructure. All subscription transactions are processed securely via encrypted gateway sandbox. No live card charges incurred.
        </p>
      </div>
    </div>
  );
}
