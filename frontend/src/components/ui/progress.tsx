import * as ProgressPrimitive from "@radix-ui/react-progress";
import { type ComponentPropsWithoutRef, forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Progress = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-2 w-full overflow-hidden rounded-full bg-slate-200", className)}
    value={value}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className="relative h-full origin-left overflow-hidden bg-brand-600 transition-transform after:absolute after:inset-y-0 after:w-1/2 after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:content-['']"
      style={{ transform: `scaleX(${Math.max(0, Math.min(100, value ?? 0)) / 100})` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = "Progress";
