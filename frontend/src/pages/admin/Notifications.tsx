import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/AdminShell";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

type Template = { id: number; key: string; subject: string; bodyHtml: string };

export const AdminNotifications = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Template | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-notification-templates"],
    queryFn: () => api.get<{ templates: Template[] }>("/admin/notifications/templates").then((r) => r.data)
  });

  const updateMut = useMutation({
    mutationFn: (t: Template) => api.patch(`/admin/notifications/templates/${t.id}`, { subject: t.subject, bodyHtml: t.bodyHtml }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ["admin-notification-templates"] }); toast.success("Template saved"); }
  });

  const broadcastMut = useMutation({
    mutationFn: () => api.post<{ sent: number }>("/admin/notifications/broadcast", { templateId: selected?.id }),
    onSuccess: (r) => { toast.success(`Broadcast sent to ${r.data.sent} students`); setBroadcasting(false); }
  });

  return (
    <AdminShell title={t("admin.notifications.title")} description={t("admin.notifications.desc")}>
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Template list */}
        <div className="space-y-3">
          {isLoading ? (
            Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-20 rounded-2xl" />)
          ) : (data?.templates ?? []).length === 0 ? (
            <div className="rounded-2xl border p-8 text-center" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No templates yet.</p>
            </div>
          ) : (
            (data?.templates ?? []).map((tmpl) => (
              <div key={tmpl.id} className={`cursor-pointer rounded-2xl border p-4 transition-all ${selected?.id === tmpl.id ? "border-brand-600" : ""}`} style={{ backgroundColor: "var(--color-surface)", borderColor: selected?.id === tmpl.id ? undefined : "var(--color-border)" }} onClick={() => setSelected({ ...tmpl })}>
                <p className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>{tmpl.key}</p>
                <p className="text-xs mt-0.5 truncate" style={{ color: "var(--color-text-muted)" }}>{tmpl.subject}</p>
              </div>
            ))
          )}
        </div>

        {/* Editor + preview */}
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-2xl border p-5 space-y-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Subject</label>
                <input className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-brand-600" style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }} value={selected.subject} onChange={(e) => setSelected({ ...selected, subject: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Body HTML</label>
                <textarea rows={6} className="w-full rounded-xl border px-4 py-2.5 text-sm font-mono outline-none focus:border-brand-600" style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", resize: "vertical" }} value={selected.bodyHtml} onChange={(e) => setSelected({ ...selected, bodyHtml: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => void updateMut.mutateAsync(selected)} disabled={updateMut.isPending} className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-60" type="button">{t("actions.save")}</button>
                <button onClick={() => setBroadcasting(true)} className="rounded-xl border px-5 py-2 text-sm font-medium" style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }} type="button">Broadcast</button>
              </div>
            </div>
            {/* Live preview */}
            <div className="rounded-2xl border p-5" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Preview</p>
              <div className="text-sm" style={{ color: "var(--color-text-primary)" }} dangerouslySetInnerHTML={{ __html: selected.bodyHtml }} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Select a template to edit</p>
          </div>
        )}
      </div>

      {broadcasting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl border p-6 max-w-sm w-full mx-4" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
            <p className="font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>Broadcast to all students?</p>
            <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>This will send the selected email template to all enrolled students.</p>
            <div className="flex gap-2">
              <button onClick={() => void broadcastMut.mutateAsync()} disabled={broadcastMut.isPending} className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white disabled:opacity-50" type="button">{broadcastMut.isPending ? "Sending..." : "Send"}</button>
              <button onClick={() => setBroadcasting(false)} className="flex-1 rounded-xl border py-2.5 text-sm font-medium" style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }} type="button">{t("actions.cancel")}</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
};
