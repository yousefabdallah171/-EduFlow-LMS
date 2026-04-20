import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] uppercase transition-colors",
  {
    variants: {
      variant: {
        default: "border-[color:color-mix(in_oklab,var(--color-brand)_26%,transparent)] bg-[color:color-mix(in_oklab,var(--color-brand)_12%,transparent)] text-brand-600",
        secondary: "border-[color:var(--color-border)] bg-surface2 text-secondary",
        destructive: "border-[color:color-mix(in_oklab,var(--color-danger)_22%,transparent)] bg-[color:color-mix(in_oklab,var(--color-danger)_10%,transparent)] text-[color:var(--color-danger)]",
        outline: "border-[color:var(--color-border-strong)] bg-transparent text-secondary"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export type BadgeProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>;

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <div className={cn(badgeVariants({ variant }), className)} {...props} />
);
