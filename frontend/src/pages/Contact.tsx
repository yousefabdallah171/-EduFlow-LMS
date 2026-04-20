import { useState } from "react";
import type { FormEvent } from "react";
import { Mail, MapPin, MessageCircle, Send, Smartphone } from "lucide-react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { resolveLocale } from "@/lib/locale";
import { contactInfo } from "@/lib/public-page-content";
import { getPublicTrustCopy } from "@/lib/public-trust-copy";

export const Contact = () => {
  const { locale } = useParams();
  const copy = getPublicTrustCopy(resolveLocale(locale)).contact;
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    try {
      await api.post("/contact", form);
      toast.success(copy.success);
      setForm({ name: "", email: "", message: "" });
    } catch {
      toast.error(copy.error);
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
            {copy.badge}
          </span>
          <h1 className="reference-title">
            {copy.title} <span className="accent-word">{copy.accent}</span>
          </h1>
          <p className="reference-subtitle">{copy.subtitle}</p>
        </header>

        <div className="contact-layout">
          <aside className="reference-card contact-panel">
            <h2 className="m-0 text-xl font-black">{copy.panelTitle}</h2>
            <p className="mt-2 leading-8" style={{ color: "var(--color-text-secondary)" }}>
              {copy.panelBody}
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
                  <div className="contact-value">{copy.location}</div>
                </div>
              </div>
            </div>

            <a className="reference-button mt-8 w-full" href={contactInfo.whatsappUrl} target="_blank" rel="noreferrer">
              <MessageCircle className="h-5 w-5" />
              {copy.whatsappCta}
            </a>
          </aside>

          <section className="reference-card contact-panel">
            <h2 className="m-0 text-xl font-black">{copy.formTitle}</h2>
            <form className="mt-6 grid gap-5" onSubmit={(event) => void handleSubmit(event)}>
              <label className="grid gap-2 text-sm font-bold">
                {copy.name}
                <input
                  required
                  minLength={2}
                  className="reference-field"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </label>

              <label className="grid gap-2 text-sm font-bold">
                {copy.email}
                <input
                  required
                  type="email"
                  className="reference-field"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </label>

              <label className="grid gap-2 text-sm font-bold">
                {copy.message}
                <textarea
                  required
                  minLength={10}
                  rows={6}
                  className="reference-field"
                  value={form.message}
                  onChange={(event) => setForm({ ...form, message: event.target.value })}
                />
              </label>

              <button className="reference-button w-full" disabled={sending} type="submit">
                <Send className="h-5 w-5" />
                {sending ? copy.sending : copy.submit}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
};
