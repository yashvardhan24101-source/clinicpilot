import React from "react";
import { cn } from "@/lib/utils";

interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  highlight?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

export const Row = React.forwardRef<HTMLDivElement, RowProps>(
  (
    {
      children,
      className,
      active = false,
      highlight = false,
      divider = true,
      onClick,
      ...props
    },
    ref
  ) => {
    const isClickable = Boolean(onClick);

    return (
      <div
        ref={ref}
        onClick={onClick}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={
          isClickable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        className={cn(
          "group relative flex items-center justify-between gap-3 px-4 py-3.5 transition-colors select-none",
          divider && "border-b border-line-subtle",
          isClickable && "cursor-pointer hover:bg-surface-2/70 active:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-inset",
          active && "bg-signal-subtle/70",
          highlight && "bg-signal-subtle/40 border-l-4 border-l-signal",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Row.displayName = "Row";
