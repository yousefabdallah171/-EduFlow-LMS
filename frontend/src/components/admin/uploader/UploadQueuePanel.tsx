import { Pause, Play, RotateCcw, Wifi, WifiOff } from "lucide-react";

import { useUploadQueue } from "@/hooks/useUploadQueue";
import { formatEta, UploadTelemetryTracker } from "@/lib/upload-eta";

const formatBytes = (bytes: number) => {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const getTelemetryDisplay = (uploadedBytes: number, totalBytes: number) => {
  const tracker = new UploadTelemetryTracker(totalBytes || 1, 2);
  tracker.track(Math.max(0, uploadedBytes - 1));
  const snapshot = tracker.track(uploadedBytes);
  return {
    speed: `${formatBytes(Math.round(snapshot.instantaneousSpeedBytesPerSecond))}/s`,
    eta: formatEta(snapshot.etaSeconds)
  };
};

export function UploadQueuePanel() {
  const { items, online, queueSummary, pause, resume, retry, retryAll } = useUploadQueue();

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Upload Queue</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {queueSummary.completed}/{queueSummary.total} completed · {queueSummary.failed} failed
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {online ? "Online" : "Offline"}
          </span>
          {queueSummary.failed > 0 && (
            <button
              type="button"
              onClick={() => void retryAll()}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Retry all failed
            </button>
          )}
        </div>
      </header>

      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-blue-500 transition-all"
          style={{ width: `${queueSummary.overallProgress}%` }}
        />
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const telemetry = getTelemetryDisplay(item.bytesUploaded, item.fileSizeBytes);
          return (
            <li
              key={item.localId}
              className="rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{item.fileName}</p>
                <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{item.status}</span>
              </div>
              <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${item.progressPercent}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>
                  {formatBytes(item.bytesUploaded)} / {formatBytes(item.fileSizeBytes)}
                </span>
                <span>
                  {telemetry.speed} · ETA {telemetry.eta}
                </span>
              </div>
              {item.errorMessage && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{item.errorMessage}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                {item.status === "uploading" && (
                  <button
                    type="button"
                    onClick={() => pause(item.localId)}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    Pause
                  </button>
                )}
                {(item.status === "paused" || item.status === "offline") && (
                  <button
                    type="button"
                    onClick={() => resume(item.localId)}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Resume
                  </button>
                )}
                {item.status === "failed" && (
                  <button
                    type="button"
                    onClick={() => retry(item.localId)}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Retry
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
