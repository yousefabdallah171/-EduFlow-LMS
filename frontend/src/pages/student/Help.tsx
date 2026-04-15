import { useState } from "react";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { StudentShell } from "@/components/layout/StudentShell";
import { api } from "@/lib/api";

const FAQ_KEYS = ["access", "download", "arabic", "coupons", "refund", "progress", "devices", "updates"] as const;

export const StudentHelp = () => {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const faqItems = FAQ_KEYS.map((key) => ({
    key,
    q: t(`faq.items.${key}.q`),
    a: t(`faq.items.${key}.a`)
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      // Validate required fields
      if (!form.name.trim()) { toast.error("Name is required"); setSending(false); return; }
      if (!form.email.trim()) { toast.error("Email is required"); setSending(false); return; }
      if (form.name.length < 2) { toast.error("Name must be at least 2 characters"); setSending(false); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { toast.error("Please enter a valid email address"); setSending(false); return; }
      if (form.message.length < 10) { toast.error("Message must be at least 10 characters"); setSending(false); return; }

      await api.post("/contact", form);
      toast.success(t("contact.successMessage"));
      setForm({ name: "", email: "", message: "" });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; fields?: Record<string, string> } } };
      const errorMsg = error.response?.data?.message || (error.response?.data?.fields ? Object.values(error.response.data.fields)[0] : t("contact.errorMessage"));
      toast.error(errorMsg);
    }
    finally { setSending(false); }
  };

  return (
    <StudentShell>
      <>
        <header className="rounded-2xl border p-6 shadow-card" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t("student.shell.section")}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>{t("student.help.title")}</h1>
        </header>

        {/* FAQ */}
        <div className="space-y-2">
          {faqItems.map((item) => (
            <Disclosure key={item.key}>
              {({ open }) => (
                <div className="overflow-hidden rounded-xl border transition-all" style={{ backgroundColor: "var(--color-surface)", borderColor: open ? "var(--color-border-strong)" : "var(--color-border)" }}>
                  <DisclosureButton className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    <span>{item.q}</span>
                    <span className="flex-shrink-0 text-lg font-thin transition-transform duration-200" style={{ transform: open ? "rotate(45deg)" : "none", color: "var(--color-text-muted)" }}>+</span>
                  </DisclosureButton>
                  <DisclosurePanel className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{item.a}</DisclosurePanel>
                </div>
              )}
            </Disclosure>
          ))}
        </div>

        {/* Contact form */}
        <div className="rounded-2xl border p-6 shadow-card" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="mb-4 text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{t("contact.title")}</p>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            {[
              { label: t("contact.name"),  field: "name"    as const, type: "text" },
              { label: t("contact.email"), field: "email"   as const, type: "email" },
            ].map(({ label, field, type }) => (
              <div key={field}>
                <label className="mb-1 block text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{label}</label>
                <input required type={type} className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-brand-600" style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
              </div>
            ))}
            <div>
              <label className="mb-1 block text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{t("contact.message")}</label>
              <textarea required rows={4} className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-brand-600" style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", resize: "vertical" }} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            <button type="submit" disabled={sending} className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-700 disabled:opacity-60">
              {sending ? t("contact.sending") : t("contact.send")}
            </button>
          </form>
        </div>
      </>
    </StudentShell>
  );
};
