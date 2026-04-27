import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

type BatchReport = {
  id: string;
  operationType: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  retriedItems: number;
  startedAt: string;
  finishedAt: string | null;
};

export function BatchSummaryCard() {
  const query = useQuery({
    queryKey: ["upload-batch-summary"],
    queryFn: async () => {
      const response = await api.get<{ reports: BatchReport[] }>("/admin/uploads/batch-summary");
      return response.data.reports;
    }
  });

  const reports = query.data ?? [];
  const latest = reports[0];

  return (
    <section className="dashboard-panel p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
        Batch Summary
      </p>
      {!latest ? (
        <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          No batch reports yet.
        </p>
      ) : (
        <div className="mt-2 space-y-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          <p>ID: {latest.id}</p>
          <p>Type: {latest.operationType}</p>
          <p>
            Completed: {latest.completedItems}/{latest.totalItems}
          </p>
          <p>Failed: {latest.failedItems}</p>
          <p>Retried: {latest.retriedItems}</p>
        </div>
      )}
    </section>
  );
}
