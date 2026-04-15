import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

export const RefundPolicy = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="mb-8 text-sm" style={{ color: "var(--color-text-muted)" }}>
          <Link className="no-underline hover:text-brand-600" to={`${prefix}/`}>{t("nav.home")}</Link>
          {" / "}
          <span style={{ color: "var(--color-text-primary)" }}>{t("legal.refund.title")}</span>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          {t("legal.refund.title")}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
          {t("legal.lastUpdated", { date: "April 14, 2026" })}
        </p>

        <div className="mt-8 rounded-2xl border p-6" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <p className="text-lg font-bold text-brand-600">30-Day Money-Back Guarantee</p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            We stand behind the quality of our course. If you're not satisfied within 30 days of purchase, we will issue a full refund — no questions asked.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <section>
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>Eligibility Conditions</h2>
            <ul className="mt-3 space-y-2">
              {[
                "Refund request submitted within 30 days of original purchase",
                "Account in good standing (no violations of Terms of Service)",
                "Less than 80% of course lessons completed",
                "Original payment method still valid for refund processing",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  <span className="mt-0.5 flex-shrink-0 text-brand-600">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>How to Request a Refund</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              Contact us through the Contact page or email support@eduflow.local with your order details. We'll process your refund within 7–14 business days.
            </p>
          </section>
        </div>

        <div className="mt-8">
          <Link
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white no-underline transition-all hover:bg-brand-700"
            to={`${prefix}/contact`}
          >
            {t("contact.title")} <span className="icon-dir opacity-70">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
