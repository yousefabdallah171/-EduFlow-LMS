import { useState } from "react";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { ChevronDown, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/PageHeader";
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
    emailInvalid: isAr ? "اكتب بريدًا إلكترونيًا صحيحًا" : "Please enter a valid email address",
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
        <PageHeader
          hero
          eyebrow={t("student.shell.section")}
          title={t("student.help.title")}
          description={
            isAr
              ? "ابدأ بالإجابات السريعة، ثم تواصل إذا احتجت دعمًا بخصوص الوصول أو الدفع أو استخدام المنصة."
              : "Start with the quick answers below, then reach out if you need help with access, payments, or using the platform."
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="dashboard-panel dashboard-panel--accent p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{isAr ? "البدء السريع" : "Quick start"}</p>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
              {isAr ? "راجع الأسئلة الشائعة أولًا، فغالبًا ستجد أسرع إجابة هناك." : "Check the FAQ first, since it usually gives you the fastest answer."}
            </p>
          </div>
          <div className="dashboard-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{isAr ? "الوصول والدفع" : "Access and payment"}</p>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
              {isAr ? "إذا كانت المشكلة مرتبطة بالشراء أو فتح الدروس، وضّح ذلك في رسالتك لتسريع المعالجة." : "If the issue is related to checkout or lesson access, mention that clearly in your message so support can triage faster."}
            </p>
          </div>
          <div className="dashboard-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>{isAr ? "الثقة والأمان" : "Trust and safety"}</p>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
              {isAr ? "لا تشارك بيانات حساسة داخل الرسالة، واكتفِ بشرح المشكلة وسياقها." : "Do not include sensitive details in your message. A clear description of the issue and context is enough."}
            </p>
          </div>
        </div>

        <section className="space-y-2">
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
        </section>

        <div className="dashboard-panel p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="mb-2 font-display text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>{t("contact.title")}</p>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {isAr ? "اكتب رسالتك بوضوح وسنساعدك في أقرب وقت ممكن." : "Send a clear message and the team can help you faster."}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: "var(--color-brand-muted)", color: "var(--color-brand)" }}>
              <Sparkles className="h-3.5 w-3.5" />
              {isAr ? "رسالة واضحة = دعم أسرع" : "Clear message = faster help"}
            </div>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {[
              { label: t("contact.name"), field: "name" as const, type: "text" },
              { label: t("contact.email"), field: "email" as const, type: "email" },
            ].map(({ label, field, type }) => (
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
            ))}
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
                <p>{isAr ? "اذكر المشكلة، الصفحة التي كنت عليها، وما الذي كنت تحاول فعله." : "Mention the issue, the page you were on, and what you were trying to do."}</p>
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
