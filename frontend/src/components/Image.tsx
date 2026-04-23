import type { ImgHTMLAttributes } from "react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  wrapperClassName?: string;
};

export const Image = ({ className, wrapperClassName, loading, decoding, onLoad, ...props }: ImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <span className={cn("relative block overflow-hidden", wrapperClassName)}>
      <img
        {...props}
        className={cn(
          "block h-full w-full transition-opacity duration-500",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        loading={loading ?? "lazy"}
        decoding={decoding ?? "async"}
        onLoad={(event) => {
          setIsLoaded(true);
          onLoad?.(event);
        }}
      />
      {!isLoaded ? (
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, color-mix(in oklab, var(--color-text-primary) 7%, transparent), color-mix(in oklab, var(--color-brand) 10%, transparent), color-mix(in oklab, var(--color-text-primary) 7%, transparent))"
          }}
        />
      ) : null}
    </span>
  );
};

