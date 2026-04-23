import * as SelectPrimitive from "@radix-ui/react-select";
import { type ComponentPropsWithoutRef, forwardRef } from "react";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex min-h-11 w-full items-center justify-between rounded-md border bg-surface px-3.5 py-2 text-sm text-primary shadow-sm focus:outline-none focus:ring-2",
      className
    )}
    style={{ borderColor: "var(--color-border-strong)" }}
    {...props}
  >
    {children}
    <ChevronDown className="h-4 w-4 text-muted" />
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = "SelectTrigger";

export const SelectContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn("z-50 min-w-32 rounded-[20px] border bg-surface p-1.5 shadow-elevated", className)}
      style={{ borderColor: "var(--color-border-strong)" }}
      {...props}
    >
      <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = "SelectContent";

export const SelectItem = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn("relative flex cursor-default select-none items-center rounded-xl px-3 py-2 text-sm text-primary outline-none focus:bg-surface2", className)}
    {...props}
  >
    <span className="absolute start-3 inline-flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-brand-600" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <span className="ps-6">
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </span>
  </SelectPrimitive.Item>
));
SelectItem.displayName = "SelectItem";
