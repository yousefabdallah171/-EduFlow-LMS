import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AdminShell } from "@/components/layout/AdminShell";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminUiCopy } from "@/lib/admin-ui-copy";
import { api } from "@/lib/api";
import { resolveLocale } from "@/lib/locale";

type Template = {
  id: number;
  key: string;
  subject: string;
  bodyHtml: string;
};

const variableHints = ["{{studentName}}", "{{courseName}}", "{{orderNumber}}", "{{supportEmail}}"];

export const AdminNotifications = () => {
  const { t, i18n } = useTranslation();
  const copy = getAdminUiCopy(resolveLocale(i18n.language));
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Template | null>(null);
  const [broadcasting, setBroadcasting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-notification-templates"],
    queryFn: () => api.get<{ templates: Template[] }>("/admin/notifications/templates").then((response) => response.data)
  });

  const templates = data?.templates ?? [];
  const previewText = useMemo(() => selected?.bodyHtml ?? "", [selected]);

  const updateMutation = useMutation({
    mutationFn: (template: Template) =>
      api.patch(`/admin/notifications/templates/${template.id}`, {
        subject: template.subject,
        bodyHtml: template.bodyHtml
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-notification-templates"] });
      toast.success(t("admin.settings.saved"));
    }
  });

  const broadcastMutation = useMutation({
    mutationFn: () => api.post<{ sent: number }>("/admin/notifications/broadcast", { templateId: selected?.id }),
    onSuccess: (response) => {
      toast.success(`${copy.common.broadcast}: ${response.data.sent}`);
      setBroadcasting(false);
    }
  });

  return (
    <AdminShell title={t("admin.notifications.title")} description={t("admin.notifications.desc")}>
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: copy.notifications.templates, value: templates.length, note: copy.notifications.templatesNote },
            { label: copy.notifications.editorMode, value: selected ? copy.notifications.active : copy.notifications.idle, note: copy.notifications.editorModeNote },
            { label: copy.notifications.broadcastSafety, value: copy.notifications.broadcastSafetyValue, note: copy.notifications.broadcastSafetyNote },
            { label: copy.notifications.variableHelp, value: variableHints.length, note: copy.notifications.variableHelpNote }
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
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
            {copy.notifications.workflow}
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {copy.notifications.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
            {copy.notifications.desc}
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-[28px]" />)
            ) : templates.length === 0 ? (
              <EmptyState
                description={copy.notifications.noTemplatesDesc}
                eyebrow="Notifications"
                icon="NT"
                title={copy.notifications.noTemplatesTitle}
              />
            ) : (
              templates.map((template) => (
                <button
                  key={template.id}
                  className="dashboard-panel w-full rounded-[28px] p-4 text-left transition-all hover:-translate-y-0.5"
                  style={{
                    backgroundColor: selected?.id === template.id ? "var(--color-brand-muted)" : undefined,
                    borderColor: selected?.id === template.id ? "var(--color-brand)" : undefined
                  }}
                  onClick={() => setSelected({ ...template })}
                  type="button"
                >
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {template.key}
                  </p>
                  <p className="mt-1 truncate text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {template.subject}
                  </p>
                </button>
              ))
            )}
          </div>

          {selected ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="dashboard-panel p-5 space-y-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                    {copy.notifications.editor}
                  </p>
                  <h3 className="mt-2 text-xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                    {selected.key}
                  </h3>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                    {copy.common.subject}
                  </label>
                  <input
                    className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-brand-600"
                    style={{
                      backgroundColor: "var(--color-page)",
                      borderColor: "var(--color-border-strong)",
                      color: "var(--color-text-primary)"
                    }}
                    value={selected.subject}
                    onChange={(event) => setSelected({ ...selected, subject: event.target.value })}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                    {copy.common.bodyHtml}
                  </label>
                  <textarea
                    rows={10}
                    className="w-full rounded-xl border px-4 py-2.5 text-sm font-mono outline-none focus:border-brand-600"
                    style={{
                      backgroundColor: "var(--color-page)",
                      borderColor: "var(--color-border-strong)",
                      color: "var(--color-text-primary)",
                      resize: "vertical"
                    }}
                    value={selected.bodyHtml}
                    onChange={(event) => setSelected({ ...selected, bodyHtml: event.target.value })}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-xl px-5 py-2 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-60"
                    style={{ background: "var(--gradient-brand)" }}
                    disabled={updateMutation.isPending}
                    onClick={() => void updateMutation.mutateAsync(selected)}
                    type="button"
                  >
                    {t("actions.save")}
                  </button>
                  <button
                    className="rounded-xl border px-5 py-2 text-sm font-medium"
                    style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-secondary)" }}
                    onClick={() => setBroadcasting(true)}
                    type="button"
                  >
                    {copy.common.broadcast}
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div className="dashboard-panel p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                    {copy.notifications.variableHelp}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {variableHints.map((hint) => (
                      <span
                        key={hint}
                        className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-secondary)" }}
                      >
                        {hint}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="dashboard-panel p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                    {copy.notifications.preview}
                  </p>
                  <div className="mt-4 space-y-4">
                    <div
                      className="rounded-2xl border p-4"
                      style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
                    >
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                        {copy.common.subject}
                      </p>
                      <p className="mt-2 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        {selected.subject || copy.common.noSubject}
                      </p>
                    </div>
                    <div
                      className="rounded-2xl border p-4 text-sm leading-7"
                      style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)", color: "var(--color-text-primary)" }}
                      dangerouslySetInnerHTML={{ __html: previewText || copy.notifications.emptyBody }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              description={copy.notifications.chooseDesc}
              eyebrow="Notification editor"
              icon="NE"
              title={copy.notifications.chooseTitle}
            />
          )}
        </div>
      </section>

      <Dialog open={broadcasting} onOpenChange={setBroadcasting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{copy.notifications.broadcastTitle}</DialogTitle>
            <DialogDescription>
              {copy.notifications.broadcastDesc}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              className="rounded-xl border px-5 py-2.5 text-sm font-medium"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
              onClick={() => setBroadcasting(false)}
              type="button"
            >
              {t("actions.cancel")}
            </button>
            <button
              className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-60"
              style={{ background: "var(--gradient-brand)" }}
              disabled={broadcastMutation.isPending}
              onClick={() => void broadcastMutation.mutateAsync()}
              type="button"
            >
              {broadcastMutation.isPending ? copy.common.sending : copy.common.confirmBroadcast}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
};
