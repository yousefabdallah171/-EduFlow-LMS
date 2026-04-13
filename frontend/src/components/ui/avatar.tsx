import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { type ComponentPropsWithoutRef, forwardRef } from "react";

import { cn } from "@/lib/utils";

export const Avatar = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn("relative inline-flex size-10 shrink-0 overflow-hidden rounded-md", className)}
    {...props}
  />
));
Avatar.displayName = "Avatar";

export const AvatarImage = forwardRef<
  HTMLImageElement,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image ref={ref} className={cn("aspect-square size-full", className)} {...props} />
));
AvatarImage.displayName = "AvatarImage";

export const AvatarFallback = forwardRef<
  HTMLSpanElement,
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex size-full items-center justify-center rounded-md bg-brand-100 text-sm font-medium text-brand-700",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";
