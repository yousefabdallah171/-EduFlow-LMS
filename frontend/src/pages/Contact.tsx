import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const Contact = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/contact", form);
      toast.success(t("contact.successMessage"));
      setForm({ name: "", email: "", message: "" });
    } catch {
      toast.error(t("contact.errorMessage"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="mx-auto max-w-2xl px-6 py-16">

        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Contact</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("contact.title")}
          </h1>
          <p className="mt-3 text-base" style={{ color: "var(--color-text-secondary)" }}>
            {t("contact.subtitle")}
          </p>
        </div>

        <div
          className="rounded-2xl border p-8 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                {t("contact.name")}
              </label>
              <input
                required
                minLength={2}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:border-brand-600"
                style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                {t("contact.email")}
              </label>
              <input
                required
                type="email"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:border-brand-600"
                style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                {t("contact.message")}
              </label>
              <textarea
                required
                minLength={10}
                rows={5}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:border-brand-600"
                style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", resize: "vertical" }}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition-all hover:bg-brand-700 disabled:opacity-60"
            >
              {sending ? t("contact.sending") : t("contact.send")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
