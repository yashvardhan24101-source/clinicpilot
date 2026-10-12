"use client";

import React, { useEffect, useState } from "react";
import { QueueState } from "@/types/api";
import { api } from "@/lib/api";
import { Clock, Users, Activity, Sparkles, AlertCircle } from "lucide-react";

interface LiveQueueBadgeProps {
  tokenNumber?: number;
  compact?: boolean;
}

export const LiveQueueBadge: React.FC<LiveQueueBadgeProps> = ({
  tokenNumber,
  compact = false,
}) => {
  const [queue, setQueue] = useState<QueueState>({
    current_token: 3,
    total_waiting: 3,
    avg_wait_minutes_per_patient: 15,
    status: "active",
  });

  useEffect(() => {
    let isMounted = true;
    const fetchQueue = () => {
      api
        .getQueue()
        .then((q) => {
          if (isMounted) setQueue(q);
        })
        .catch(() => {});
    };

    fetchQueue();
    const interval = setInterval(fetchQueue, 5000); // 5s poll for real-time updates
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!tokenNumber) return null;

  const currentToken = queue.current_token;
  const isNow = tokenNumber === currentToken;
  const isPast = tokenNumber < currentToken;
  const ahead = Math.max(0, tokenNumber - currentToken);
  const estWait = ahead * queue.avg_wait_minutes_per_patient;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-signal/10 text-signal text-xs font-bold font-display">
          🎟️ Token #{tokenNumber}
        </span>
        {isNow ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-mint bg-mint/10 px-2 py-0.5 rounded-md animate-pulse">
            <span className="h-2 w-2 rounded-full bg-mint" />
            Your Turn Now!
          </span>
        ) : isPast ? (
          <span className="text-[11px] font-semibold text-ink-muted">
            Visited (Token #{tokenNumber})
          </span>
        ) : (
          <span className="text-[11px] font-medium text-ink-muted flex items-center gap-1">
            <Clock className="h-3 w-3 text-signal" />
            {ahead} {ahead === 1 ? "patient" : "patients"} ahead (~{estWait}m wait)
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface-2/60 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-mint animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted font-display">
            Live Clinic Queue Tracker
          </span>
        </div>
        <span className="text-[11px] font-semibold text-signal bg-signal/10 px-2 py-0.5 rounded-full">
          Live Sync
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-surface-1 rounded-xl p-2 border border-line shadow-2xs">
          <span className="text-[10px] text-ink-muted uppercase font-bold block">
            Now Serving
          </span>
          <span className="text-base font-extrabold text-ink font-display">
            Token #{currentToken}
          </span>
        </div>

        <div className="bg-signal/10 rounded-xl p-2 border border-signal/20 shadow-2xs">
          <span className="text-[10px] text-signal uppercase font-bold block">
            Your Token
          </span>
          <span className="text-base font-extrabold text-signal font-display">
            #{tokenNumber}
          </span>
        </div>

        <div className="bg-surface-1 rounded-xl p-2 border border-line shadow-2xs">
          <span className="text-[10px] text-ink-muted uppercase font-bold block">
            Est. Wait
          </span>
          <span className="text-base font-extrabold text-ink font-display">
            {isNow ? "0 mins" : isPast ? "Done" : `~${estWait} mins`}
          </span>
        </div>
      </div>

      {isNow ? (
        <div className="p-2 rounded-xl bg-mint/15 border border-mint/30 text-mint text-xs font-bold text-center animate-pulse">
          🔔 It is your turn! Please proceed to the doctor&apos;s cabin.
        </div>
      ) : isPast ? (
        <div className="text-[11px] text-ink-muted text-center">
          Consultation completed. Thank you for visiting.
        </div>
      ) : (
        <div className="text-[11px] text-ink-muted text-center flex items-center justify-center gap-1">
          <Users className="h-3.5 w-3.5 text-signal" />
          <span>
            {ahead} {ahead === 1 ? "patient is" : "patients are"} currently ahead of you.
          </span>
        </div>
      )}
    </div>
  );
};
