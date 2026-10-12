import React from "react";
import {
  Clock,
  UserCheck,
  CheckCircle2,
  UserX,
  XCircle,
  AlertTriangle,
  Bot,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppointmentStatus, ConversationState } from "@/types/api";

export type StatusPillType =
  | AppointmentStatus
  | ConversationState
  | "connected"
  | "disconnected"
  | "syncing";

interface StatusPillProps {
  status: StatusPillType | string;
  customLabel?: string;
  size?: "sm" | "md";
  className?: string;
}

const statusConfig: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
  }
> = {
  booked: {
    icon: Clock,
    label: "Booked",
    bgClass: "bg-warn-subtle",
    textClass: "text-warn-foreground",
    borderClass: "border-warn/30",
  },
  arrived: {
    icon: UserCheck,
    label: "Arrived",
    bgClass: "bg-ok-subtle",
    textClass: "text-ok-foreground",
    borderClass: "border-ok/30",
  },
  completed: {
    icon: CheckCircle2,
    label: "Completed",
    bgClass: "bg-ok-subtle",
    textClass: "text-ok-foreground",
    borderClass: "border-ok/30",
  },
  no_show: {
    icon: UserX,
    label: "No-Show",
    bgClass: "bg-alert-subtle",
    textClass: "text-alert-foreground",
    borderClass: "border-alert/30",
  },
  cancelled: {
    icon: XCircle,
    label: "Cancelled",
    bgClass: "bg-alert-subtle",
    textClass: "text-alert-foreground",
    borderClass: "border-alert/30",
  },
  needs_staff: {
    icon: AlertTriangle,
    label: "Needs Staff",
    bgClass: "bg-alert-subtle",
    textClass: "text-alert-foreground",
    borderClass: "border-alert/40",
  },
  bot_handling: {
    icon: Bot,
    label: "Bot Active",
    bgClass: "bg-signal-subtle",
    textClass: "text-signal",
    borderClass: "border-signal/30",
  },
  resolved: {
    icon: CheckCircle2,
    label: "Resolved",
    bgClass: "bg-surface-2",
    textClass: "text-ink-soft",
    borderClass: "border-line",
  },
  connected: {
    icon: CheckCircle2,
    label: "Connected",
    bgClass: "bg-ok-subtle",
    textClass: "text-ok-foreground",
    borderClass: "border-ok/30",
  },
  disconnected: {
    icon: XCircle,
    label: "Disconnected",
    bgClass: "bg-alert-subtle",
    textClass: "text-alert-foreground",
    borderClass: "border-alert/30",
  },
  syncing: {
    icon: Clock,
    label: "Syncing",
    bgClass: "bg-warn-subtle",
    textClass: "text-warn-foreground",
    borderClass: "border-warn/30",
  },
};

export const StatusPill: React.FC<StatusPillProps> = ({
  status,
  customLabel,
  size = "sm",
  className,
}) => {
  const config = statusConfig[status] || {
    icon: HelpCircle,
    label: status,
    bgClass: "bg-surface-2",
    textClass: "text-ink-soft",
    borderClass: "border-line",
  };

  const Icon = config.icon;
  const label = customLabel || config.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium select-none whitespace-nowrap",
        config.bgClass,
        config.textClass,
        config.borderClass,
        size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className
      )}
      role="status"
      aria-label={label}
    >
      <Icon className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4", "shrink-0")} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};
