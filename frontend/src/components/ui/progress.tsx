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
      className="h-full bg-brand-600 transition-all"
      style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = "Progress";
