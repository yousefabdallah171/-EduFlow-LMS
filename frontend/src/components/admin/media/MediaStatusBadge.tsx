type MediaStatus = "UPLOADING" | "PROCESSING" | "READY" | "ERROR";

const statusStyles: Record<MediaStatus, string> = {
  UPLOADING: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  PROCESSING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  READY: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  ERROR: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
};

export function MediaStatusBadge({ status }: { status: MediaStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusStyles[status]}`}>
      {status}
    </span>
  );
}
