import { useState } from "react";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { Link, useParams } from "react-router-dom";
import { MessageCircle } from "lucide-react";

import { contactInfo } from "@/lib/public-page-content";
import { resolveLocale } from "@/lib/locale";
import { getPublicTrustCopy } from "@/lib/public-trust-copy";
import { SEO } from "@/components/shared/SEO";
import { SEO_PAGES } from "@/lib/seo-config";

const staticFaqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What are the prerequisites for this course?",
      "acceptedAnswer": { "@type": "Answer", "text": "Basic programming knowledge is helpful but not required. The course is designed to be accessible to motivated learners." },
    },
    {
      "@type": "Question",
      "name": "Do I get lifetime access?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. One payment gives you lifetime access to all course content including future updates." },
    },
    {
      "@type": "Question",
      "name": "Is there a refund policy?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. We offer refunds as described in our refund policy at yousef-abdallah.online/refund." },
    },
    {
      "@type": "Question",
      "name": "Is the course available in Arabic?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. The course platform fully supports Arabic and all content is bilingual (English and Arabic)." },
    },
  ],
};

export const FAQ = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const copy = getPublicTrustCopy(resolveLocale(locale)).faq;
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();

  const filtered = normalizedSearch
    ? copy.items.filter((item) =>
        `${item.q ?? ""} ${item.a ?? ""} ${(item.pills ?? []).join(" ")}`.toLowerCase().includes(normalizedSearch)
      )
    : copy.items;

  return (
    <main className="reference-page">
      <SEO page={SEO_PAGES.faq} structuredData={staticFaqSchema} />
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

        <input
          className="reference-field mb-5"
          placeholder={copy.search}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div className="faq-stack">
          {filtered.map((item, index) => (
            <Disclosure defaultOpen={index === 0} key={item.q}>
              {({ open }) => (
                <article className="reference-card faq-item-reference">
                  <DisclosureButton className="faq-question-reference">
                    <span>{item.q}</span>
                    <span className="faq-toggle-reference">{open ? "x" : "+"}</span>
                  </DisclosureButton>
                  <DisclosurePanel className="faq-answer-reference">
                    <p className="m-0">{item.a}</p>
                    <div className="faq-pills-reference">
                      {item.pills.map((pill) => (
                        <span className="reference-chip" key={pill}>{pill}</span>
                      ))}
                    </div>
                  </DisclosurePanel>
                </article>
              )}
            </Disclosure>
          ))}
          {filtered.length === 0 ? (
            <p className="reference-card p-6 text-center" style={{ color: "var(--color-text-secondary)" }}>
              {copy.empty}
            </p>
          ) : null}
        </div>

        <section className="reference-card reference-card--lime mt-14 p-8 text-center">
          <span className="reference-badge">
            <span className="reference-dot" aria-hidden="true" />
            {copy.ctaBadge}
          </span>
          <h2 className="mt-5 font-display text-3xl font-black">{copy.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-lg leading-8" style={{ color: "var(--color-text-secondary)" }}>
            {copy.ctaBody}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link className="reference-button" to={`${prefix}/pricing`}>{copy.primary}</Link>
            <a className="reference-button-secondary" href={contactInfo.whatsappUrl} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              {copy.secondary}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
};
