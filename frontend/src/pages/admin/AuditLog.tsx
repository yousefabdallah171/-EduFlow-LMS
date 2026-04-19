import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AdminShell } from "@/components/layout/AdminShell";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

type AuditEntry = { id: string; action: string; targetType: string; targetId: string; createdAt: string; metadata: Record<string, unknown>; admin: { fullName: string; email: string } };

export const AdminAuditLog = () => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => api.get<{ logs: AuditEntry[]; total: number }>("/admin/audit").then((r) => r.data)
  });

  return (
    <AdminShell title={t("admin.audit.title")} description={t("admin.audit.desc")}>
      <div className="dashboard-panel overflow-hidden">
        {isLoading ? (
          <div className="p-5 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : (data?.logs ?? []).length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>No audit log entries yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                {["Time", "Actor", "Action", "Target"].map((h) => (
                  <th key={h} className="px-4 py-3 text-start text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data?.logs ?? []).map((entry, i) => (
                <Fragment key={entry.id}>
                  <tr
                    className={`cursor-pointer transition-colors hover:bg-surface2 ${i < (data?.logs.length ?? 0) - 1 ? "border-b" : ""}`}
                    style={{ borderColor: "var(--color-border)" }}
                    onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                  >
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--color-text-primary)" }}>{entry.admin.fullName}</td>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: "var(--color-text-secondary)" }}>{entry.action}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>{entry.targetType}/{entry.targetId}</td>
                  </tr>
                  {expanded === entry.id && (
                    <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                      <td colSpan={4} className="px-4 py-3">
                        <pre className="rounded-lg p-3 text-xs overflow-auto" style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-secondary)" }}>
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
};
