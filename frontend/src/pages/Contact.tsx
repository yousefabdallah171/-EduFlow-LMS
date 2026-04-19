import { useState } from "react";
import type { FormEvent } from "react";
import { Mail, MapPin, MessageCircle, Send, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { contactInfo } from "@/lib/public-page-content";

export const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/contact", form);
      toast.success("تم الإرسال. هنرد عليك قريباً.");
      setForm({ name: "", email: "", message: "" });
    } catch {
      toast.error("فشل الإرسال. جرّب مرة تانية أو كلّمنا على واتساب.");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="reference-page">
      <div className="reference-shell">
        <header className="reference-hero">
          <span className="reference-badge">
            <span className="reference-dot" aria-hidden="true" />
            رد خلال ساعة في أوقات العمل
          </span>
          <h1 className="reference-title">
            تواصل <span className="accent-word">معانا</span>
          </h1>
          <p className="reference-subtitle">
            عندك سؤال قبل الاشتراك؟ ابعتلنا على واتساب أو اكتب رسالتك هنا، وهنساعدك تختار الباقة المناسبة.
          </p>
        </header>

        <div className="contact-layout">
          <aside className="reference-card contact-panel">
            <h2 className="m-0 text-xl font-black">معلومات التواصل</h2>
            <p className="mt-2 leading-8" style={{ color: "var(--color-text-secondary)" }}>
              أفضل طريقة للتواصل السريع هي واتساب، خصوصاً لو عندك سؤال عن الدفع، الوصول، أو الباقة المناسبة.
            </p>

            <div className="contact-list">
              <div className="contact-item">
                <span className="contact-icon"><Smartphone className="h-5 w-5" /></span>
                <div>
                  <div className="contact-label">WhatsApp</div>
                  <a className="contact-value block no-underline" href={contactInfo.whatsappUrl} target="_blank" rel="noreferrer">
                    {contactInfo.whatsapp}
                  </a>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon"><Mail className="h-5 w-5" /></span>
                <div>
                  <div className="contact-label">Email</div>
                  <a className="contact-value block no-underline" href={`mailto:${contactInfo.email}`}>
                    {contactInfo.email}
                  </a>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon"><MapPin className="h-5 w-5" /></span>
                <div>
                  <div className="contact-label">Location</div>
                  <div className="contact-value">{contactInfo.locationAr}</div>
                </div>
              </div>
            </div>

            <a className="reference-button mt-8 w-full" href={contactInfo.whatsappUrl} target="_blank" rel="noreferrer">
              <MessageCircle className="h-5 w-5" />
              كلّمني على الواتساب
            </a>
          </aside>

          <section className="reference-card contact-panel">
            <h2 className="m-0 text-xl font-black">ابعت رسالتك</h2>
            <form className="mt-6 grid gap-5" onSubmit={(e) => void handleSubmit(e)}>
              <label className="grid gap-2 text-sm font-bold">
                اسمك
                <input
                  required
                  minLength={2}
                  className="reference-field"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>

              <label className="grid gap-2 text-sm font-bold">
                البريد الإلكتروني
                <input
                  required
                  type="email"
                  className="reference-field"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>

              <label className="grid gap-2 text-sm font-bold">
                رسالتك
                <textarea
                  required
                  minLength={10}
                  rows={6}
                  className="reference-field"
                  style={{ resize: "vertical" }}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </label>

              <button className="reference-button w-full border-0" disabled={sending} type="submit">
                <Send className="h-4 w-4" />
                {sending ? "جاري الإرسال..." : "إرسال الرسالة"}
              </button>

              <p className="m-0 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                بياناتك تُستخدم فقط للرد على طلبك ومساعدتك في التسجيل.
              </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
};
