"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Phone,
  Calendar,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Row } from "@/components/ui/row";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatDateDisplay, maskPhoneNumber } from "@/lib/utils";
import { FollowUp } from "@/types/api";

export default function FollowUpsPage() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "due" | "sent" | "snoozed">("all");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: followups = [], isLoading } = useQuery({
    queryKey: ["followups"],
    queryFn: () => api.getFollowUps(),
  });

  // Send Reminders Mutation
  const sendMutation = useMutation({
    mutationFn: (ids: string[]) => api.sendFollowUps(ids),
    onSuccess: (data) => {
      setSelectedIds([]);
      setSuccessMessage(
        `Sent ${data.sent_count} WhatsApp reminder(s) via Meta Cloud API (${data.cost_note})`
      );
      queryClient.invalidateQueries({ queryKey: ["followups"] });
      setTimeout(() => setSuccessMessage(null), 5000);
    },
  });

  // Snooze Reminders Mutation
  const snoozeMutation = useMutation({
    mutationFn: ({ ids, days }: { ids: string[]; days: number }) =>
      api.snoozeFollowUps(ids, days),
    onSuccess: (data) => {
      setSelectedIds([]);
      setSuccessMessage(`Snoozed ${data.snoozed_count} patient follow-up(s).`);
      queryClient.invalidateQueries({ queryKey: ["followups"] });
      setTimeout(() => setSuccessMessage(null), 5000);
    },
  });

  const filteredFollowups = followups.filter((f) => {
    if (filter === "all") return true;
    return f.status === filter;
  });

  // Group by service
  const groupedByService = filteredFollowups.reduce<Record<string, FollowUp[]>>(
    (acc, item) => {
      if (!acc[item.service_name]) {
        acc[item.service_name] = [];
      }
      acc[item.service_name].push(item);
      return acc;
    },
    {}
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredFollowups.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredFollowups.map((f) => f.id));
    }
  };

  const totalCost = (selectedIds.length * 0.8).toFixed(2);

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 space-y-4 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-ink-soft text-xs font-semibold uppercase tracking-wider font-display">
            <BellRing className="h-3.5 w-3.5 text-signal" />
            <span>Automated Recall Pipeline</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-ink font-display mt-0.5">
            Patient Follow-ups &amp; Recalls
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleSelectAll}
            className="text-xs h-8"
          >
            {selectedIds.length === filteredFollowups.length && filteredFollowups.length > 0
              ? "Deselect All"
              : "Select All"}
          </Button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-ok-subtle border border-ok/30 text-xs font-semibold text-ok flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
            filter === "all"
              ? "bg-signal text-white border-signal shadow-sm"
              : "bg-surface-1 text-ink-soft border-line hover:bg-surface-2"
          }`}
        >
          All ({followups.length})
        </button>
        <button
          onClick={() => setFilter("due")}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
            filter === "due"
              ? "bg-warn text-white border-warn shadow-sm"
              : "bg-surface-1 text-ink-soft border-line hover:bg-surface-2"
          }`}
        >
          Due Recalls ({followups.filter((f) => f.status === "due").length})
        </button>
        <button
          onClick={() => setFilter("sent")}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
            filter === "sent"
              ? "bg-ok text-white border-ok shadow-sm"
              : "bg-surface-1 text-ink-soft border-line hover:bg-surface-2"
          }`}
        >
          Sent ({followups.filter((f) => f.status === "sent").length})
        </button>
        <button
          onClick={() => setFilter("snoozed")}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors border ${
            filter === "snoozed"
              ? "bg-signal-subtle text-signal border-signal/30 shadow-sm"
              : "bg-surface-1 text-ink-soft border-line hover:bg-surface-2"
          }`}
        >
          Snoozed ({followups.filter((f) => f.status === "snoozed").length})
        </button>
      </div>

      {/* Follow-up Groupings by Service */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : Object.keys(groupedByService).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedByService).map(([serviceName, items]) => (
            <div
              key={serviceName}
              className="bg-surface-1 rounded-2xl border border-line shadow-subtle overflow-hidden"
            >
              <div className="px-4 py-3 bg-surface-2/40 border-b border-line-subtle flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-signal" />
                  <h3 className="text-sm font-bold text-ink font-display">
                    {serviceName}
                  </h3>
                </div>
                <span className="text-xs text-ink-soft font-display">
                  {items.length} patient{items.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="divide-y divide-line-subtle">
                {items.map((item) => {
                  const isChecked = selectedIds.includes(item.id);

                  return (
                    <Row
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className={`cursor-pointer transition-colors ${
                        isChecked ? "bg-signal-subtle/50" : "hover:bg-surface-2/60"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Handled by Row onClick
                          className="h-4 w-4 rounded border-line text-signal focus:ring-signal shrink-0 pointer-events-none"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="text-sm font-bold text-ink truncate font-devanagari">
                              {item.patient_name}
                            </span>
                            <span className="text-[11px] text-ink-faint font-display">
                              Due: {formatDateDisplay(item.due_date)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-ink-soft">
                            <span className="font-display">
                              {maskPhoneNumber(item.patient_phone)}
                            </span>
                            <span>• Last visit: {formatDateDisplay(item.last_visit_date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {item.status === "due" && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warn-subtle text-warn-foreground border border-warn/30">
                            Due
                          </span>
                        )}
                        {item.status === "sent" && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-ok-subtle text-ok border border-ok/30 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Sent</span>
                          </span>
                        )}
                        {item.status === "snoozed" && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-signal-subtle text-signal border border-signal/30 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Snoozed</span>
                          </span>
                        )}
                      </div>
                    </Row>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-1 rounded-2xl border border-line p-12 text-center space-y-2">
          <BellRing className="h-8 w-8 text-ink-faint mx-auto" />
          <p className="text-sm font-medium text-ink">No follow-ups match your filter.</p>
          <p className="text-xs text-ink-soft">
            Patients due for follow-ups or checkups will appear here automatically.
          </p>
        </div>
      )}

      {/* Floating Sticky Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-16 lg:bottom-6 left-4 right-4 max-w-2xl mx-auto z-40 bg-surface-1/95 backdrop-blur-md border border-line shadow-lg rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in slide-in-from-bottom-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-signal text-white text-xs font-bold font-display">
                {selectedIds.length}
              </span>
              <span className="text-xs font-bold text-ink font-display">
                Patient{selectedIds.length !== 1 ? "s" : ""} Selected
              </span>
            </div>
            <p className="text-[11px] text-ink-soft mt-0.5">
              WhatsApp Meta cost: ~₹{totalCost} (₹0.80 / msg utility tier)
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => snoozeMutation.mutate({ ids: selectedIds, days: 7 })}
              disabled={snoozeMutation.isPending}
              className="gap-1 h-8 text-xs"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Snooze (7d)</span>
            </Button>

            <Button
              size="sm"
              onClick={() => sendMutation.mutate(selectedIds)}
              disabled={sendMutation.isPending}
              className="gap-1.5 h-8 text-xs shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{sendMutation.isPending ? "Sending..." : "Send Reminders"}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
