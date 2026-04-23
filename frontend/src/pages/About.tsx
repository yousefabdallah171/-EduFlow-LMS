import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { resolveLocale } from "@/lib/locale";
import { getPublicTrustCopy } from "@/lib/public-trust-copy";

export const About = () => {
  const { locale } = useParams();
  const resolvedLocale = resolveLocale(locale);
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const copy = getPublicTrustCopy(resolvedLocale).about;

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

        <section className="reference-card p-8 md:p-10">
          <div className="grid gap-8 md:grid-cols-[220px_1fr] md:items-start">
            <div className="reference-card reference-card--lime grid aspect-square place-items-center p-6 text-center">
              <div>
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl border text-3xl font-black" style={{ borderColor: "var(--color-border-strong)", color: "var(--color-brand-text)" }}>
                  AI
                </div>
                <p className="mt-5 text-sm font-black">{copy.portraitName}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>{copy.portraitRole}</p>
              </div>
            </div>

            <div>
              <h2 className="m-0 font-display text-3xl font-black">{copy.philosophyTitle}</h2>
              <p className="mt-4 leading-8" style={{ color: "var(--color-text-secondary)" }}>
                {copy.body}
              </p>
              <div className="mt-6 grid gap-3">
                {copy.bullets.map((item) => (
                  <div className="flex items-start gap-3" key={item}>
                    <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-brand-600" />
                    <span style={{ color: "var(--color-text-secondary)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="inner-stat-strip">
          {copy.stats.map((stat) => (
            <div className="inner-stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link className="reference-button" to={`${prefix}/pricing`}>
            {copy.primary}
            <ArrowLeft className="icon-dir h-4 w-4" />
          </Link>
          <Link className="reference-button-secondary" to={`${prefix}/preview`}>
            {copy.secondary}
          </Link>
        </div>
      </div>
    </main>
  );
};
