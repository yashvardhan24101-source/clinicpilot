import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border border-line bg-surface-1 px-3.5 py-2 text-base text-ink shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:border-signal disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-surface-2",
          error && "border-alert focus-visible:ring-alert",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
