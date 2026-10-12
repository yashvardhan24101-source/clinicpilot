"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Clock,
  MessageSquare,
  Users,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavProps {
  unreadInboxCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ unreadInboxCount = 2 }) => {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/today",
      label: "Today",
      icon: Clock,
      exact: true,
    },
    {
      href: "/calendar",
      label: "Calendar",
      icon: CalendarDays,
    },
    {
      href: "/inbox",
      label: "Inbox",
      icon: MessageSquare,
      badge: unreadInboxCount,
    },
    {
      href: "/patients",
      label: "Patients",
      icon: Users,
    },
    {
      href: "/more",
      label: "More",
      icon: MoreHorizontal,
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t lg:hidden select-none"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Mobile Navigation"
    >
      <div className="flex h-16 items-center justify-around px-2 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all duration-150",
                isActive
                  ? "text-signal font-semibold"
                  : "text-ink-soft hover:text-ink"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform",
                    isActive && "scale-110"
                  )}
                  aria-hidden="true"
                />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-alert text-[10px] font-bold text-white font-display">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] mt-1 font-medium leading-none">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 h-1 w-5 rounded-full bg-signal" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
