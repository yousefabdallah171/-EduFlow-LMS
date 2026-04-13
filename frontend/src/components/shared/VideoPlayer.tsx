import { useEffect, useMemo, useRef, useState } from "react";
import {
  FloatingPortal,
  offset,
  shift,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole
} from "@floating-ui/react";

import { cn } from "@/lib/utils";
import { WatermarkOverlay } from "@/components/shared/WatermarkOverlay";

type VideoPlayerProps = {
  lessonTitle: string;
  sourceUrl: string;
  watermark: {
    name: string;
    maskedEmail: string;
  } | null;
  initialPositionSeconds?: number;
  onProgress?: (payload: { lastPositionSeconds: number; watchTimeSeconds: number; completed: boolean }) => void;
  onTokenExpired?: () => void;
};

type TooltipButtonProps = {
  label: string;
  description: string;
};

const TooltipButton = ({ label, description }: TooltipButtonProps) => {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    middleware: [offset(10), shift()]
  });
  const hover = useHover(context);
  const focus = useFocus(context);
  const role = useRole(context, { role: "tooltip" });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, role]);

  return (
    <>
      <button
        ref={refs.setReference}
        className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur"
        type="button"
        {...getReferenceProps()}
      >
        {label}
      </button>
      {open ? (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-30 max-w-48 rounded-xl bg-slate-950 px-3 py-2 text-xs text-white shadow-2xl dark:bg-zinc-800"
            {...getFloatingProps()}
          >
            {description}
          </div>
        </FloatingPortal>
      ) : null}
    </>
  );
};

export const VideoPlayer = ({
  lessonTitle,
  sourceUrl,
  watermark,
  initialPositionSeconds = 0,
  onProgress,
  onTokenExpired
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const hasAttachedRef = useRef(false);
  const lastReportedPositionRef = useRef(0);
  // Track actual elapsed watch time (not playback position)
  const watchStartTimeRef = useRef<number | null>(null);
  const accumulatedWatchSecondsRef = useRef(0);
  const [status, setStatus] = useState("Protected playback ready");
  const [isAttaching, setIsAttaching] = useState(false);
  const [isAttached, setIsAttached] = useState(false);

  const destroyHls = () => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
    hasAttachedRef.current = false;
    setIsAttached(false);
  };

  const attachStream = async () => {
    const video = videoRef.current;
    if (!video || !sourceUrl || hasAttachedRef.current) {
      return;
    }
    setIsAttaching(true);

    if (sourceUrl === "/demo-video.m3u8") {
      video.src = sourceUrl;
      hasAttachedRef.current = true;
      setIsAttached(true);
      setIsAttaching(false);
      setStatus("Demo playback ready");
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = sourceUrl;
      hasAttachedRef.current = true;
      setIsAttached(true);
      setIsAttaching(false);
      return;
    }

    const module = await import("hls.js");
    const Hls = module.default;
    if (!Hls.isSupported()) {
      video.src = sourceUrl;
      hasAttachedRef.current = true;
      setIsAttached(true);
      setIsAttaching(false);
      return;
    }

    const hls = new Hls({
      xhrSetup: (xhr) => {
        xhr.withCredentials = true;
      }
    });
    hls.loadSource(sourceUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (data?.response?.code === 401) {
        onTokenExpired?.();
      }
    });
    hlsRef.current = hls;
    hasAttachedRef.current = true;
    setIsAttached(true);
    setIsAttaching(false);
  };

  useEffect(() => {
    return () => {
      destroyHls();
    };
  }, []);

  useEffect(() => {
    destroyHls();
    setStatus("Protected playback ready");
    accumulatedWatchSecondsRef.current = 0;
    watchStartTimeRef.current = null;
    lastReportedPositionRef.current = 0;
  }, [sourceUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || initialPositionSeconds <= 0) {
      return;
    }

    const applyPosition = () => {
      video.currentTime = initialPositionSeconds;
    };

    video.addEventListener("loadedmetadata", applyPosition, { once: true });
    return () => {
      video.removeEventListener("loadedmetadata", applyPosition);
    };
  }, [initialPositionSeconds]);

  const progressLabel = useMemo(
    () => watermark ? `${watermark.name} - ${watermark.maskedEmail}` : "Preview",
    [watermark]
  );

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-4 shadow-[0_30px_90px_rgba(15,23,42,0.18)] backdrop-blur dark:border-white/5 dark:bg-zinc-900/90">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.25em] text-brand-600 dark:text-brand-400">Secure stream</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-zinc-50">{lessonTitle}</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">{status}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <TooltipButton label="WM" description={`Visible forensic watermark: ${progressLabel}`} />
          <TooltipButton label="JWT" description="Playback URL is bound to the active session and expires automatically." />
          <TooltipButton label="AES" description="Manifest requests the decryption key through a protected endpoint." />
        </div>
      </div>

      <div className="relative mt-6 overflow-hidden rounded-[1.75rem] bg-zinc-950">
        {!isAttached ? (
          <div className="absolute inset-0 z-20 grid place-items-center bg-zinc-950/80">
            <button
              className="rounded-full bg-white/90 px-5 py-3 text-sm font-semibold text-slate-950 transition-transform hover:scale-105 active:scale-95"
              onClick={async () => {
                await attachStream();
                const video = videoRef.current;
                if (video) {
                  void video.play().catch(() => undefined);
                }
              }}
              type="button"
            >
              {isAttaching ? "Preparing stream…" : "▶ Play protected video"}
            </button>
          </div>
        ) : null}
        <video
          ref={videoRef}
          className={cn("aspect-video w-full bg-zinc-950")}
          controls
          playsInline
          onPlay={() => {
            void attachStream();
            setStatus("Streaming protected HLS");
            // Start tracking real watch time
            watchStartTimeRef.current = Date.now();
          }}
          onPause={() => {
            setStatus("Playback paused");
            // Accumulate watch time but DO NOT destroy HLS — keep stream attached
            if (watchStartTimeRef.current !== null) {
              accumulatedWatchSecondsRef.current += Math.floor((Date.now() - watchStartTimeRef.current) / 1000);
              watchStartTimeRef.current = null;
            }
          }}
          onEnded={() => {
            setStatus("Playback ended");
            if (watchStartTimeRef.current !== null) {
              accumulatedWatchSecondsRef.current += Math.floor((Date.now() - watchStartTimeRef.current) / 1000);
              watchStartTimeRef.current = null;
            }
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            const currentTime = Math.floor(video.currentTime);

            if (currentTime - lastReportedPositionRef.current < 5) {
              return;
            }

            lastReportedPositionRef.current = currentTime;

            // Compute actual accumulated watch time (elapsed real time while playing)
            const currentWatchSeconds =
              accumulatedWatchSecondsRef.current +
              (watchStartTimeRef.current !== null ? Math.floor((Date.now() - watchStartTimeRef.current) / 1000) : 0);

            onProgress?.({
              lastPositionSeconds: currentTime,
              watchTimeSeconds: currentWatchSeconds,
              completed: Boolean(video.duration && currentTime >= video.duration * 0.9)
            });
          }}
        />
        {watermark ? <WatermarkOverlay name={watermark.name} maskedEmail={watermark.maskedEmail} /> : null}
      </div>
    </section>
  );
};
