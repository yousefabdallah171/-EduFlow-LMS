import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

import type { PolicySection } from "@/lib/public-page-content";

type PolicyPageProps = {
  title: string;
  accent: string;
  intro: string;
  sections: PolicySection[];
  children?: ReactNode;
};

export const PolicyPage = ({ title, accent, intro, sections, children }: PolicyPageProps) => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t } = useTranslation();

  return (
    <main className="reference-page">
      <div className="reference-shell reference-shell--narrow">
        <nav className="mb-8 text-sm font-semibold" style={{ color: "var(--color-text-muted)" }}>
          <Link className="no-underline hover:text-brand-600" to={`${prefix}/`}>
            {t("nav.home")}
          </Link>
          <span className="mx-2">/</span>
          <span style={{ color: "var(--color-text-primary)" }}>{title}</span>
        </nav>

        <header className="reference-hero">
          <span className="reference-badge">
            <span className="reference-dot" aria-hidden="true" />
            آخر تحديث: أبريل ٢٠٢٥
          </span>
          <h1 className="reference-title">
            {title} <span className="accent-word">{accent}</span>
          </h1>
          <p className="reference-subtitle">{intro}</p>
        </header>

        {children}

        <div className="policy-body">
          {sections.map((section) => (
            <section className="policy-section" key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Link className="reference-button" to={`${prefix}/pricing`}>
            احجز مكانك
          </Link>
          <Link className="reference-button-secondary" to={`${prefix}/contact`}>
            تواصل معنا
          </Link>
        </div>
      </div>
    </main>
  );
};
