import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type WatermarkOverlayProps = {
  name: string;
  maskedEmail: string;
};

const positions = ["start-4 top-4", "end-4 top-12", "start-8 bottom-16", "end-8 bottom-6"] as const;

export const WatermarkOverlay = ({ name, maskedEmail }: WatermarkOverlayProps) => {
  const [positionIndex, setPositionIndex] = useState(0);
  const [timeBucket, setTimeBucket] = useState(() => new Date().toISOString().slice(11, 16));

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPositionIndex((current) => (current + 1) % positions.length);
      setTimeBucket(new Date().toISOString().slice(11, 16));
    }, 45000);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-20 rounded-full border border-white/20 bg-slate-950/45 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-lg transition-all duration-700",
        positions[positionIndex]
      )}
      data-testid="watermark-overlay"
    >
      {name} | {maskedEmail} | {timeBucket}
    </div>
  );
};
