import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const About = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="mx-auto max-w-5xl px-6 py-16">

        {/* Hero */}
        <div className="mb-12 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t("about.subtitle")}</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("about.title")}
          </h1>
        </div>

        {/* Instructor card */}
        <div
          className="mb-10 flex flex-col gap-8 rounded-2xl border p-8 shadow-card sm:flex-row sm:items-start"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          {/* Photo slot */}
          <div
            className="mx-auto h-32 w-32 flex-shrink-0 rounded-2xl sm:mx-0"
            style={{ backgroundColor: "var(--color-brand)", opacity: 0.15 }}
            aria-label={t("about.photoAlt")}
            role="img"
          >
            <div
              className="flex h-32 w-32 items-center justify-center rounded-2xl text-4xl font-bold text-brand-600"
              style={{ opacity: 1 }}
            >
              A
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              {t("about.instructorName")}
            </h2>
            <p className="mt-1 text-sm font-medium text-brand-600">{t("about.credentials")}</p>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {t("about.bio")}
            </p>
          </div>
        </div>

        {/* Teaching philosophy */}
        <div
          className="mb-10 rounded-2xl border p-8"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-brand-600">{t("about.philosophy")}</p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            {t("about.philosophy")}
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white no-underline transition-all hover:bg-brand-700"
            to={`${prefix}/pricing`}
          >
            {t("pricing.cta")} <span className="icon-dir opacity-70">→</span>
          </Link>
          <Link
            className="rounded-xl border px-6 py-3 text-sm font-medium no-underline transition-colors hover:bg-surface2"
            style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
            to={`${prefix}/`}
          >
            {t("actions.backToHome")}
          </Link>
        </div>
      </div>
    </div>
  );
};
