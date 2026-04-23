import { useMemo, useState } from "react";
import { Send, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/PageHeader";
import { StudentShell } from "@/components/layout/StudentShell";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

export const StudentHelp = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [form, setForm] = useState({ subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const signedInLabel = useMemo(() => {
    if (!user?.email) return "";
    return t("student.help.signedInAs", { email: user.email });
  }, [t, user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/student/tickets", { subject: form.subject.trim(), message: form.message.trim() });
      toast.success(t("contact.successMessage"));
      setForm({ subject: "", message: "" });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; fields?: Record<string, string> } } };
      const errorMsg = error.response?.data?.message || (error.response?.data?.fields ? Object.values(error.response.data.fields)[0] : t("contact.errorMessage"));
      toast.error(errorMsg);
    } finally {
      setSending(false);
    }
  };

  return (
    <StudentShell>
      <>
        <PageHeader
          hero
          eyebrow={t("student.shell.section")}
          title={t("student.help.title")}
          description={t("student.help.description")}
        />

        <div className="dashboard-panel p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 font-display text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>{t("contact.title")}</p>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {t("student.help.description")}
              </p>
            </div>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {signedInLabel ? (
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {signedInLabel}
              </p>
            ) : null}

            <div>
              <label className="ui-field-label">{t("student.help.subjectLabel")}</label>
              <input
                required
                type="text"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder={t("student.help.subjectPlaceholder")}
              />
            </div>
            <div>
              <label className="ui-field-label">{t("contact.message")}</label>
              <textarea
                required
                rows={5}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", resize: "vertical" }}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>

            <div className="ui-feedback">
              <div className="inline-flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 text-brand-600" />
                <p>{t("student.help.tip")}</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={sending}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-60"
              style={{ background: "var(--gradient-brand)" }}
            >
              <Send className="h-4 w-4" />
              {sending ? t("contact.sending") : t("contact.send")}
            </button>
          </form>
        </div>
      </>
    </StudentShell>
  );
};
