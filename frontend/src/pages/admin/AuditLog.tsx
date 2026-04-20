import { Fragment, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminUiCopy } from "@/lib/admin-ui-copy";
import { api } from "@/lib/api";
import { resolveLocale } from "@/lib/locale";

type AuditEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  admin: { fullName: string; email: string };
};

export const AdminAuditLog = () => {
  const { t, i18n } = useTranslation();
  const copy = getAdminUiCopy(resolveLocale(i18n.language));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => api.get<{ logs: AuditEntry[]; total: number }>("/admin/audit").then((response) => response.data)
  });

  const logs = useMemo(() => data?.logs ?? [], [data?.logs]);
  const filteredLogs = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return logs;

    return logs.filter((entry) =>
      [entry.action, entry.targetType, entry.targetId, entry.admin.fullName, entry.admin.email]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [logs, search]);

  return (
    <AdminShell title={t("admin.audit.title")} description={t("admin.audit.desc")}>
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: copy.audit.visibleEntries, value: filteredLogs.length, note: copy.audit.visibleEntriesNote },
            { label: copy.audit.totalEntries, value: logs.length, note: copy.audit.totalEntriesNote },
            { label: copy.audit.uniqueActors, value: new Set(logs.map((entry) => entry.admin.email)).size, note: copy.audit.uniqueActorsNote },
            { label: copy.audit.expandedRow, value: expanded ? "1" : "0", note: copy.audit.expandedRowNote }
          ].map((item) => (
            <div key={item.label} className="dashboard-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {item.value}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                {item.note}
              </p>
            </div>
          ))}
        </div>

        <div className="dashboard-panel p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {copy.audit.workspace}
              </p>
              <h2 className="text-2xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {copy.audit.title}
              </h2>
              <p className="max-w-3xl text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
                {copy.audit.desc}
              </p>
            </div>

            <div className="w-full max-w-sm">
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {copy.audit.searchLabel}
              </label>
              <input
                className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-600"
                placeholder={copy.audit.searchPlaceholder}
                style={{
                  backgroundColor: "var(--color-page)",
                  borderColor: "var(--color-border-strong)",
                  color: "var(--color-text-primary)"
                }}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="dashboard-panel overflow-hidden">
          {isLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div>
          ) : filteredLogs.length === 0 ? (
            <EmptyState
              description={copy.audit.noMatchDesc}
              eyebrow="Audit log"
              icon="AL"
              title={copy.audit.noMatchTitle}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                    {[copy.audit.time, copy.audit.actor, copy.audit.action, copy.audit.target].map((heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-start text-xs font-bold uppercase tracking-[0.16em]"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((entry, index) => (
                    <Fragment key={entry.id}>
                      <tr
                        className={`cursor-pointer transition-colors hover:bg-surface2 ${index < filteredLogs.length - 1 ? "border-b" : ""}`}
                        style={{ borderColor: "var(--color-border)" }}
                        onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                      >
                        <td className="px-4 py-4 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          {new Date(entry.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                            {entry.admin.fullName}
                          </p>
                          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                            {entry.admin.email}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-secondary)" }}
                          >
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                          {entry.targetType}/{entry.targetId}
                        </td>
                      </tr>
                      {expanded === entry.id ? (
                        <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
                          <td colSpan={4} className="px-4 py-4">
                            <div
                              className="rounded-2xl border p-4"
                              style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
                            >
                              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                                {copy.audit.metadata}
                              </p>
                              <pre
                                className="mt-3 overflow-auto text-xs leading-6"
                                style={{ color: "var(--color-text-secondary)" }}
                              >
                                {JSON.stringify(entry.metadata, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </AdminShell>
  );
};
