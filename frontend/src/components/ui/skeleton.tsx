import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const Skeleton = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("ui-skeleton relative overflow-hidden rounded-md", className)}
    style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--color-text-primary) 7%, transparent), color-mix(in oklab, var(--color-brand) 8%, transparent), color-mix(in oklab, var(--color-text-primary) 7%, transparent))" }}
    {...props}
  />
);
