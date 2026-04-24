import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { resolveLocale } from "@/lib/locale";
import { api } from "@/lib/api";
import { contactInfo } from "@/lib/public-page-content";
import { getPublicTrustCopy } from "@/lib/public-trust-copy";
import { useAuthStore } from "@/stores/auth.store";

export const Contact = () => {
  const { locale } = useParams();
  const { t } = useTranslation();
  const resolved = resolveLocale(locale);
  const copy = getPublicTrustCopy(resolved).contact;
  const { user } = useAuthStore();

  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || user.fullName || "",
      email: prev.email || user.email || ""
    }));
  }, [user]);

  const signedInLabel = useMemo(() => {
    if (!user?.email) return "";
    return t("contact.signedInAs", { email: user.email });
  }, [t, user?.email]);

  const validationMessages = {
    nameRequired: t("contact.validation.nameRequired"),
    emailRequired: t("contact.validation.emailRequired"),
    nameShort: t("contact.validation.nameShort"),
    emailInvalid: t("contact.validation.emailInvalid"),
    messageShort: t("contact.validation.messageShort")
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);

    try {
      const name = (user?.fullName ?? form.name).trim();
      const email = (user?.email ?? form.email).trim();

      if (!name) { toast.error(validationMessages.nameRequired); return; }
      if (!email) { toast.error(validationMessages.emailRequired); return; }
      if (name.length < 2) { toast.error(validationMessages.nameShort); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error(validationMessages.emailInvalid); return; }
      if (form.message.trim().length < 10) { toast.error(validationMessages.messageShort); return; }

      await api.post("/contact", { name, email, message: form.message.trim() });
      toast.success(copy.success);
      setForm({ name: "", email: "", message: "" });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; fields?: Record<string, string> } } };
      const message =
        error.response?.data?.message ||
        (error.response?.data?.fields ? Object.values(error.response.data.fields)[0] : copy.error);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="reference-page">
      <div className="reference-shell reference-shell--narrow">
        <header className="reference-hero">
          <span className="reference-badge">
            <span className="reference-dot" aria-hidden="true" />
            {copy.badge}
          </span>
          <h1 className="reference-title">
            {copy.title} <span className="accent-word">{copy.accent}</span>
          </h1>
          <p className="reference-subtitle">{copy.subtitle}</p>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <section className="reference-card reference-card--lime p-6 md:p-8">
            <div className="flex items-start gap-3">
              <span
                className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl text-brand-600"
                style={{ backgroundColor: "var(--color-brand-muted)" }}
              >
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-black" style={{ color: "var(--color-text-primary)" }}>{copy.panelTitle}</p>
                <p className="mt-2 text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>{copy.panelBody}</p>
              </div>
            </div>

            <div className="mt-6 space-y-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <div className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
                <span>{t("contact.whatsapp")}</span>
                <a className="inline-flex items-center gap-2 font-bold text-brand-600 no-underline" href={contactInfo.whatsappUrl} target="_blank" rel="noreferrer">
                  {contactInfo.whatsapp}
                  <MessageCircle className="h-4 w-4" />
                </a>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: "var(--color-border)" }}>
                <span>{t("contact.location")}</span>
                <span style={{ color: "var(--color-text-primary)" }}>{copy.location}</span>
              </div>
            </div>

            <a className="reference-button mt-6 w-full justify-center" href={contactInfo.whatsappUrl} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              {copy.whatsappCta}
            </a>
          </section>

          <section className="reference-card p-6 md:p-8">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="m-0 font-display text-xl font-black" style={{ color: "var(--color-text-primary)" }}>{copy.formTitle}</p>
                <p className="mt-2 text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
                  {t("contact.formHint")}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "var(--color-brand-muted)", color: "var(--color-brand)" }}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {t("contact.formTipBadge")}
              </div>
            </div>

            <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
              {signedInLabel ? (
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {signedInLabel}
                </p>
              ) : (
                ([
                  { label: copy.name, field: "name" as const, type: "text" as const },
                  { label: copy.email, field: "email" as const, type: "email" as const }
                ]).map(({ label, field, type }) => (
                  <div key={field}>
                    <label className="ui-field-label">{label}</label>
                    <input
                      required
                      type={type}
                      className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                      style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                      value={form[field]}
                      onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                    />
                  </div>
                ))
              )}

              <div>
                <label className="ui-field-label">{copy.message}</label>
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
                  <p>
                    {t("contact.formTip")}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-60"
                style={{ background: "var(--gradient-brand)" }}
              >
                <Send className="h-4 w-4" />
                {sending ? copy.sending : copy.submit}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
};

