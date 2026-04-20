import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex min-h-11 w-full rounded-md border bg-surface2 px-3.5 py-2.5 text-sm text-primary shadow-sm transition-colors placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{
        borderColor: "var(--color-border-strong)",
        boxShadow: "0 0 0 0 transparent"
      }}
      {...props}
    />
  )
);
Input.displayName = "Input";
