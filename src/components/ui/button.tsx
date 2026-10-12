import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        default:
          "bg-signal text-white hover:bg-signal-hover active:scale-[0.98] shadow-sm",
        secondary:
          "bg-surface-2 text-ink hover:bg-line/60 active:scale-[0.98]",
        outline:
          "border border-line bg-surface-1 text-ink hover:bg-surface-2 active:scale-[0.98]",
        ghost:
          "text-ink hover:bg-surface-2 hover:text-ink active:scale-[0.98]",
        ok:
          "bg-ok text-white hover:opacity-90 active:scale-[0.98] shadow-sm",
        warn:
          "bg-warn text-white hover:opacity-90 active:scale-[0.98] shadow-sm",
        alert:
          "bg-alert text-white hover:opacity-90 active:scale-[0.98] shadow-sm",
        pill:
          "bg-surface-2 text-ink-soft hover:bg-line/50 rounded-full text-xs font-semibold px-3 py-1",
      },
      size: {
        default: "min-h-[44px] px-4 py-2 text-sm",
        sm: "min-h-[36px] px-3 py-1.5 text-xs",
        lg: "min-h-[48px] px-6 py-3 text-base font-semibold",
        icon: "h-11 w-11 p-0 flex items-center justify-center",
        "icon-sm": "h-9 w-9 p-0 flex items-center justify-center",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
