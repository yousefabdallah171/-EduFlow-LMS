import { useState } from "react";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { ChevronDown, HelpCircle, Send } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { StudentShell } from "@/components/layout/StudentShell";
import { api } from "@/lib/api";

const FAQ_KEYS = ["access", "download", "arabic", "coupons", "refund", "progress", "devices", "updates"] as const;

export const StudentHelp = () => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const faqItems = FAQ_KEYS.map((key) => ({
    key,
    q: t(`faq.items.${key}.q`),
    a: t(`faq.items.${key}.a`)
  }));

  const validationMessages = {
    nameRequired: isAr ? "الاسم مطلوب" : "Name is required",
    emailRequired: isAr ? "البريد الإلكتروني مطلوب" : "Email is required",
    nameShort: isAr ? "الاسم يجب أن يكون حرفين على الأقل" : "Name must be at least 2 characters",
    emailInvalid: isAr ? "اكتب بريد إلكتروني صحيح" : "Please enter a valid email address",
    messageShort: isAr ? "الرسالة يجب أن تكون 10 أحرف على الأقل" : "Message must be at least 10 characters"
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      if (!form.name.trim()) {
        toast.error(validationMessages.nameRequired);
        setSending(false);
        return;
      }
      if (!form.email.trim()) {
        toast.error(validationMessages.emailRequired);
        setSending(false);
        return;
      }
      if (form.name.length < 2) {
        toast.error(validationMessages.nameShort);
        setSending(false);
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        toast.error(validationMessages.emailInvalid);
        setSending(false);
        return;
      }
      if (form.message.length < 10) {
        toast.error(validationMessages.messageShort);
        setSending(false);
        return;
      }

      await api.post("/contact", form);
      toast.success(t("contact.successMessage"));
      setForm({ name: "", email: "", message: "" });
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
        <header className="dashboard-panel dashboard-hero dashboard-panel--strong p-6">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
            <HelpCircle className="h-3.5 w-3.5" />
            {t("student.shell.section")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>{t("student.help.title")}</h1>
        </header>

        <div className="space-y-2">
          {faqItems.map((item) => (
            <Disclosure key={item.key}>
              {({ open }) => (
                <div className="dashboard-panel overflow-hidden rounded-[24px] transition-all" style={{ borderColor: open ? "var(--color-border-strong)" : "var(--color-border)" }}>
                  <DisclosureButton className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    <span>{item.q}</span>
                    <ChevronDown className="h-4 w-4 flex-shrink-0 transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "none", color: "var(--color-text-muted)" }} />
                  </DisclosureButton>
                  <DisclosurePanel className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{item.a}</DisclosurePanel>
                </div>
              )}
            </Disclosure>
          ))}
        </div>

        <div className="dashboard-panel p-6">
          <p className="mb-4 font-display text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>{t("contact.title")}</p>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {[
              { label: t("contact.name"), field: "name" as const, type: "text" },
              { label: t("contact.email"), field: "email" as const, type: "email" },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "var(--color-text-muted)" }}>{label}</label>
                <input
                  required
                  type={type}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                  style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "var(--color-text-muted)" }}>{t("contact.message")}</label>
              <textarea
                required
                rows={4}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", resize: "vertical" }}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
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
