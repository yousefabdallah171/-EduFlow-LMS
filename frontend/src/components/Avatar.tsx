import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

import { Image } from "@/components/Image";
import { cn } from "@/lib/utils";

type AvatarProps = {
  src?: string | null;
  alt: string;
  fallback: string;
  className?: string;
  style?: CSSProperties;
  imageClassName?: string;
};

export const Avatar = ({ src, alt, fallback, className, style, imageClassName }: AvatarProps) => {
  const [hasError, setHasError] = useState(false);
  const normalizedSrc = useMemo(() => (src ? src.trim() : ""), [src]);
  const showImage = Boolean(normalizedSrc) && !hasError;

  return (
    <div className={cn("flex items-center justify-center overflow-hidden", className)} style={style}>
      {showImage ? (
        <Image
          src={normalizedSrc}
          alt={alt}
          className={cn("h-full w-full object-cover", imageClassName)}
          wrapperClassName="h-full w-full"
          onError={() => setHasError(true)}
          onLoad={() => setHasError(false)}
        />
      ) : (
        <span>{fallback}</span>
      )}
    </div>
  );
};

