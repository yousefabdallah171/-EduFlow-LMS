import { useMemo, useState } from "react";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { Search, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { contactInfo } from "@/lib/public-page-content";

type FaqItem = {
  q: string;
  a: string;
  bullets?: string[];
};

const buildWhatsappUrl = (baseUrl: string, message: string) => {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}text=${encodeURIComponent(message)}`;
};

export const LandingFaqSection = ({ prefix }: { prefix: string }) => {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  const items = t("landing.faq.items", { returnObjects: true }) as FaqItem[];

  const titleLines = t("landing.faq.titleLines", { returnObjects: true }) as string[];
  const subtitle = t("landing.faq.subtitle");
  const earlyAccessNote = t("landing.faq.earlyAccessNote");

  const formTitle = t("landing.faq.form.title");
  const formPlaceholder = t("landing.faq.form.placeholder");
  const formCta = t("landing.faq.form.cta");
  const formHint = t("landing.faq.form.hint");

  const [question, setQuestion] = useState("");

  const whatsappHref = useMemo(() => {
    const trimmed = question.trim();
    const base = isAr ? "عندي سؤال:" : "I have a question:";
    const message = trimmed ? `${base}\n${trimmed}` : base;
    return buildWhatsappUrl(contactInfo.whatsappUrl, message);
  }, [question, isAr]);

  return (
    <section className="landing-section landing-faq" id="faq" data-landing-section>
      <header className="text-center">
        <span className="reference-badge landing-reveal">
          <span className="reference-dot" aria-hidden="true" />
          {t("landing.faq.eyebrow")}
        </span>
        <h2 className="mt-5 font-display text-3xl font-black tracking-tight landing-reveal">
          {titleLines[0]}
          <span className="block">
            {titleLines[1]} <span className="accent-word">{titleLines[2]}</span>
          </span>
        </h2>
        <p className="mx-auto mt-3 max-w-2xl leading-8 landing-reveal" style={{ color: "var(--color-text-secondary)" }}>
          {subtitle}
        </p>
      </header>

      <div className="mt-7 space-y-3">
        {items.map((item, index) => (
          <Disclosure defaultOpen={index === 0} key={item.q}>
            {({ open }) => (
              <article className="reference-card faq-item-reference landing-reveal">
                <DisclosureButton className="faq-question-reference">
                  <span>{item.q}</span>
                  <span className="faq-toggle-reference">{open ? "×" : "+"}</span>
                </DisclosureButton>
                <DisclosurePanel className="faq-answer-reference">
                  <p className="m-0">{item.a}</p>
                  {item.bullets?.length ? (
                    <ul className="landing-faq-bullets">
                      {item.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </DisclosurePanel>
              </article>
            )}
          </Disclosure>
        ))}
      </div>

      <p className="landing-faq-note landing-reveal">{earlyAccessNote}</p>

      <div className="mt-6 flex flex-wrap justify-center gap-3 landing-reveal">
        <Link className="reference-button-secondary inline-flex items-center gap-2" to={`${prefix}/faq`}>
          <Search className="h-4 w-4" />
          {isAr ? "كل الأسئلة" : "All questions"}
        </Link>
        <a
          className="reference-button-secondary inline-flex items-center gap-2"
          href={contactInfo.whatsappUrl}
          rel="noreferrer"
          target="_blank"
        >
          <ShieldCheck className="h-4 w-4" />
          {isAr ? "كلمني واتساب" : "WhatsApp me"}
        </a>
      </div>

      <section className="reference-card mt-8 p-6 landing-reveal">
        <h3 className="m-0 font-display text-xl font-black">{formTitle}</h3>
        <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {formHint}
        </p>
        <form
          className="landing-faq-form"
          onSubmit={(event) => {
            event.preventDefault();
            window.open(whatsappHref, "_blank", "noopener,noreferrer");
          }}
        >
          <label className="sr-only" htmlFor="landing-faq-question">
            {formPlaceholder}
          </label>
          <textarea
            className="reference-field landing-faq-textarea"
            dir="auto"
            id="landing-faq-question"
            name="question"
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={formPlaceholder}
            rows={4}
            value={question}
          />
          <button className="reference-button landing-faq-submit" disabled={!question.trim()} type="submit">
            {formCta}
          </button>
        </form>
      </section>
    </section>
  );
};

