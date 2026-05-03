import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

type VideoPlayerProps = {
  lessonTitle: string;
  sourceUrl: string;
  watermark: {
    name: string;
    maskedEmail: string;
  } | null;
  initialPositionSeconds?: number;
  onProgress?: (payload: { lastPositionSeconds: number; watchTimeSeconds: number; completed: boolean }) => void;
  onCurrentPositionChange?: (seconds: number) => void;
  onTokenExpired?: () => void;
  playbackExpiresAt?: string | null;
};

export const VideoPlayer = ({
  lessonTitle,
  sourceUrl,
  initialPositionSeconds = 0,
  onProgress,
  onCurrentPositionChange,
  onTokenExpired,
  playbackExpiresAt
}: VideoPlayerProps) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const hasAttachedRef = useRef(false);
  const lastReportedPositionRef = useRef(0);
  const streamKeyRef = useRef<string | null>(null);
  const resumePlaybackRef = useRef(false);
  const resumePositionRef = useRef(initialPositionSeconds);
  const watchStartTimeRef = useRef<number | null>(null);
  const accumulatedWatchSecondsRef = useRef(0);
  const labelsRef = useRef({
    readyProtected: t("video.readyProtected"),
    readyDemo: t("video.readyDemo"),
    unsupported: t("video.unsupported")
  });
  const [status, setStatus] = useState(t("video.readyProtected"));
  const [isAttaching, setIsAttaching] = useState(false);
  const [isAttached, setIsAttached] = useState(false);

  const destroyHls = () => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
    hasAttachedRef.current = false;
    setIsAttached(false);
  };

  useEffect(() => {
    labelsRef.current = {
      readyProtected: t("video.readyProtected"),
      readyDemo: t("video.readyDemo"),
      unsupported: t("video.unsupported")
    };
  }, [t]);

  const attachStream = useCallback(async () => {
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
      setStatus(labelsRef.current.readyDemo);
      return;
    }

    const attachNativeStream = () => {
      video.src = sourceUrl;
      hasAttachedRef.current = true;
      setIsAttached(true);
      setIsAttaching(false);
    };

    const hasNativeHls = Boolean(video.canPlayType("application/vnd.apple.mpegurl"));
    const module = await import("hls.js");
    const Hls = module.default;
    if (!Hls.isSupported()) {
      if (hasNativeHls) {
        attachNativeStream();
      } else {
        setStatus(labelsRef.current.unsupported);
        setIsAttaching(false);
      }
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
      if (data?.response?.code === 401 || data?.response?.code === 403) {
        setStatus(t("video.preparing"));
        onTokenExpired?.();
      }
    });
    hlsRef.current = hls;
    hasAttachedRef.current = true;
    setIsAttached(true);
    setIsAttaching(false);
  }, [onTokenExpired, sourceUrl, t]);

  useEffect(() => {
    return () => {
      destroyHls();
    };
  }, []);

  useEffect(() => {
    const nextStreamKey = sourceUrl.split("?")[0] ?? sourceUrl;
    const isSameStream = streamKeyRef.current === nextStreamKey;
    const video = videoRef.current;
    if (video) {
      resumePositionRef.current = Math.max(initialPositionSeconds, Math.floor(video.currentTime));
      resumePlaybackRef.current = !video.paused && !video.ended;
      if (resumePlaybackRef.current && watchStartTimeRef.current !== null) {
        accumulatedWatchSecondsRef.current += Math.floor((Date.now() - watchStartTimeRef.current) / 1000);
      }
    } else {
      resumePositionRef.current = initialPositionSeconds;
      resumePlaybackRef.current = false;
    }

    destroyHls();
    setStatus(labelsRef.current.readyProtected);
    if (!isSameStream) {
      accumulatedWatchSecondsRef.current = 0;
      watchStartTimeRef.current = null;
      lastReportedPositionRef.current = 0;
    } else if (resumePlaybackRef.current) {
      watchStartTimeRef.current = Date.now();
    }
    streamKeyRef.current = nextStreamKey;
  }, [initialPositionSeconds, sourceUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const targetPosition = resumePositionRef.current > 0 ? resumePositionRef.current : initialPositionSeconds;
    if (targetPosition <= 0) {
      return;
    }

    const applyPosition = () => {
      video.currentTime = targetPosition;
      resumePositionRef.current = targetPosition;
    };

    video.addEventListener("loadedmetadata", applyPosition, { once: true });
    return () => {
      video.removeEventListener("loadedmetadata", applyPosition);
    };
  }, [initialPositionSeconds, sourceUrl]);

  useEffect(() => {
    if (!resumePlaybackRef.current) {
      return;
    }

    let cancelled = false;
    void attachStream().then(() => {
      if (cancelled) {
        return;
      }

      const video = videoRef.current;
      if (video) {
        void video.play().catch(() => undefined);
      }
      resumePlaybackRef.current = false;
    });

    return () => {
      cancelled = true;
    };
  }, [attachStream, sourceUrl]);

  useEffect(() => {
    if (typeof window === "undefined" || !playbackExpiresAt || !onTokenExpired) {
      return;
    }

    const expiryMs = new Date(playbackExpiresAt).getTime();
    if (!Number.isFinite(expiryMs)) {
      return;
    }

    const delayMs = Math.max(expiryMs - Date.now() - 60 * 1000, 0);
    const timer = window.setTimeout(() => {
      onTokenExpired();
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [onTokenExpired, playbackExpiresAt, sourceUrl]);

  return (
    <section
      className="rounded-[2rem] border p-4 backdrop-blur"
      style={{
        borderColor: "color-mix(in oklab, var(--color-brand) 16%, var(--color-border))",
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 96%, white), color-mix(in oklab, var(--color-surface-2) 90%, transparent))",
        boxShadow: "var(--shadow-elevated)"
      }}
    >
	      <div className="flex items-start justify-between gap-4">
	        <div>
	          <p className="m-0 text-xs font-semibold uppercase tracking-[0.25em] text-brand-600">
	            {t("lesson.secureStream")}
	          </p>
	          <h2 className="mt-2 text-2xl font-semibold" style={{ color: "var(--color-text-primary)" }}>{lessonTitle}</h2>
	        </div>
	      </div>

	      <p className="sr-only" aria-live="polite">
	        {status}
	      </p>

	      <div
	        className="relative mt-6 overflow-hidden rounded-[1.75rem]"
	        style={{
          background:
            "linear-gradient(180deg, color-mix(in oklab, var(--color-invert) 92%, black), color-mix(in oklab, var(--color-invert-2) 96%, black))"
        }}
      >
        {!isAttached ? (
          <div className="absolute inset-0 z-20 grid place-items-center" style={{ background: "color-mix(in srgb, var(--color-invert) 72%, transparent)" }}>
            <button
              className="rounded-full px-5 py-3 text-sm font-semibold transition-transform hover:scale-105 active:scale-95"
              style={{ background: "var(--gradient-brand)", color: "var(--color-text-invert)" }}
              onClick={async () => {
                await attachStream();
                const video = videoRef.current;
                if (video) {
                  void video.play().catch(() => undefined);
                }
              }}
              type="button"
            >
              {isAttaching ? t("video.preparing") : t("video.play")}
            </button>
          </div>
        ) : null}
        <video
          ref={videoRef}
          className={cn("aspect-video w-full")}
          style={{ backgroundColor: "var(--color-invert)" }}
          controls
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          crossOrigin="use-credentials"
          playsInline
          onContextMenu={(event) => {
            event.preventDefault();
          }}
          onPlay={() => {
            void attachStream();
            setStatus(t("video.streaming"));
            if (watchStartTimeRef.current === null) {
              watchStartTimeRef.current = Date.now();
            }
          }}
          onPause={() => {
            setStatus(t("video.paused"));
            if (watchStartTimeRef.current !== null) {
              accumulatedWatchSecondsRef.current += Math.floor((Date.now() - watchStartTimeRef.current) / 1000);
              watchStartTimeRef.current = null;
            }
          }}
          onEnded={() => {
            setStatus(t("video.ended"));
            if (watchStartTimeRef.current !== null) {
              accumulatedWatchSecondsRef.current += Math.floor((Date.now() - watchStartTimeRef.current) / 1000);
              watchStartTimeRef.current = null;
            }
          }}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            const currentTime = Math.floor(video.currentTime);

            onCurrentPositionChange?.(currentTime);

            if (currentTime - lastReportedPositionRef.current < 5) {
              return;
            }

            lastReportedPositionRef.current = currentTime;
            resumePositionRef.current = currentTime;

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
      </div>
    </section>
  );
};
