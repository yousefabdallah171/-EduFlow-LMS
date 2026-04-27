import { useEffect, useState } from "react";
import { X, ChevronUp, ChevronDown, Play, Pause, Trash2 } from "lucide-react";
import { useUploadStore, UploadQueueItem } from "@/stores/upload.store";

export function UploadQueue() {
  const {
    queue,
    activeUploadId,
    isQueueOpen,
    toggleQueue,
    removeItem,
    pauseUpload,
    resumeUpload,
    clearDone
  } = useUploadStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const doneCount = queue.filter((item) => item.status === "done").length;
  const errorCount = queue.filter((item) => item.status === "error").length;
  const totalProgress = queue.length > 0
    ? Math.round(
        (queue.reduce((sum, item) => sum + item.progress, 0) / queue.length)
      )
    : 0;

  if (queue.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
      {/* Collapsed header */}
      {!isQueueOpen && (
        <button
          onClick={toggleQueue}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {queue.length}
              </span>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Uploading...
              </p>
              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>
            </div>
          </div>
          <ChevronUp className="w-5 h-5 text-gray-400" />
        </button>
      )}

      {/* Expanded panel */}
      {isQueueOpen && (
        <div className="flex flex-col max-h-96">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Upload Queue
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {queue.filter((i) => i.status !== "done").length} active •{" "}
                {doneCount} done {errorCount > 0 && `• ${errorCount} errors`}
              </p>
            </div>
            <button
              onClick={toggleQueue}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Items list */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-200 dark:divide-gray-700">
            {queue.map((item) => (
              <UploadQueueItemRow
                key={item.id}
                item={item}
                isActive={activeUploadId === item.id}
                onPause={() => pauseUpload(item.id)}
                onResume={() => resumeUpload(item.id)}
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </div>

          {/* Footer */}
          {doneCount > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={clearDone}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear completed ({doneCount})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UploadQueueItemRow({
  item,
  isActive,
  onPause,
  onResume,
  onRemove
}: {
  item: UploadQueueItem;
  isActive: boolean;
  onPause: () => void;
  onResume: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {item.filename}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {item.bytesUploaded > 0 ? (
              <>{formatBytes(item.bytesUploaded)}</>
            ) : (
              <>Queued</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {item.status === "uploading" && (
            <button onClick={onPause} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <Pause className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          {item.status === "paused" && (
            <button onClick={onResume} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <Play className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          {item.status !== "done" && item.status !== "error" && (
            <button onClick={onRemove} className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded">
              <X className="w-4 h-4 text-red-500" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {item.status === "uploading" || item.status === "paused" ? (
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              item.status === "paused" ? "bg-yellow-500" : "bg-blue-500"
            }`}
            style={{ width: `${item.progress}%` }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                item.status === "done"
                  ? "bg-green-500"
                  : item.status === "error"
                    ? "bg-red-500"
                    : "bg-yellow-500"
              }`}
              style={{ width: "100%" }}
            />
          </div>
          <span className="text-xs font-medium capitalize text-gray-600 dark:text-gray-400">
            {item.status}
          </span>
        </div>
      )}

      {item.error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2 truncate">
          {item.error}
        </p>
      )}
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
