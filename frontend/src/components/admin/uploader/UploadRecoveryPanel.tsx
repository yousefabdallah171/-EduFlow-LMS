import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";

type TelemetryResponse = {
  queueDepth: number;
  processingRatePerMinute: number;
  failedPerHour: number;
  stuckItems: number;
  stuckSessionIds: string[];
};

type RetryResponse = {
  batchReportId: string | null;
  scheduledItems: number;
};

export function UploadRecoveryPanel({ onRecovered }: { onRecovered?: () => void }) {
  const telemetryQuery = useQuery({
    queryKey: ["upload-recovery-telemetry"],
    queryFn: async () => {
      const response = await api.get<TelemetryResponse>("/admin/media-library/telemetry");
      return response.data;
    }
  });

  const retryMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<RetryResponse>("/admin/uploads/retry-failed", {
        scope: "CURRENT_FILTER",
        filter: { status: "FAILED" }
      });
      return response.data;
    },
    onSuccess: async (result) => {
      toast.success(`Scheduled ${result.scheduledItems} items for retry`);
      await telemetryQuery.refetch();
      onRecovered?.();
    },
    onError: () => {
      toast.error("Retry-all-failed action failed");
    }
  });

  const telemetry = telemetryQuery.data;

  return (
    <section className="dashboard-panel p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
            Recovery
          </p>
          <h4 className="mt-1 text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
            Upload Recovery Panel
          </h4>
        </div>
        <button
          type="button"
          className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold dark:border-gray-600"
          onClick={() => void retryMutation.mutateAsync()}
          disabled={retryMutation.isPending}
        >
          {retryMutation.isPending ? "Retrying..." : "Retry All Failed"}
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800">
          Queue Depth: {telemetry?.queueDepth ?? 0}
        </div>
        <div className="rounded-md bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800">
          Processing/min: {telemetry?.processingRatePerMinute ?? 0}
        </div>
        <div className="rounded-md bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800">
          Failed/hour: {telemetry?.failedPerHour ?? 0}
        </div>
        <div className="rounded-md bg-gray-50 px-3 py-2 text-xs dark:bg-gray-800">
          Stuck Items: {telemetry?.stuckItems ?? 0}
        </div>
      </div>

      {(telemetry?.stuckSessionIds.length ?? 0) > 0 && (
        <ul className="mt-3 max-h-24 space-y-1 overflow-y-auto rounded-md border border-amber-200 p-2 text-xs text-amber-700 dark:border-amber-800 dark:text-amber-300">
          {telemetry?.stuckSessionIds.map((id) => <li key={id}>{id}</li>)}
        </ul>
      )}
    </section>
  );
}
