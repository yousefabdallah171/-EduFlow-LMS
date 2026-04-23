import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type WatermarkOverlayProps = {
  name: string;
  maskedEmail: string;
};

const positions = [
  "start-4 top-4",
  "end-4 top-12",
  "start-8 bottom-16",
  "end-8 bottom-6",
  "start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
  "start-6 top-1/3",
  "end-6 top-1/3",
  "start-1/4 bottom-8"
] as const;

export const WatermarkOverlay = ({ name, maskedEmail }: WatermarkOverlayProps) => {
  const [positionIndex, setPositionIndex] = useState(0);
  const [timeBucket, setTimeBucket] = useState(() => new Date().toISOString().slice(11, 16));
  const [opacityLevel, setOpacityLevel] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPositionIndex((current) => (current + 1) % positions.length);
      setTimeBucket(new Date().toISOString().slice(11, 16));
      setOpacityLevel(Math.random() > 0.5 ? 0 : 1);
    }, 20000);

    return () => window.clearInterval(interval);
  }, []);

  const opacity = opacityLevel === 0 ? "opacity-60" : "opacity-85";

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-20 select-none rounded-full border border-white/20 bg-slate-950/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition-all duration-700",
        positions[positionIndex],
        opacity
      )}
      data-testid="watermark-overlay"
    >
      {name} | {maskedEmail} | {timeBucket}
    </div>
  );
};
