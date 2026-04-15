import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

const sections = [
  { id: "collection", title: "1. Data We Collect", content: "We collect your name, email address, and payment information when you register or purchase the course. We also collect usage data such as lesson progress and watch time to improve your learning experience." },
  { id: "usage", title: "2. How We Use Your Data", content: "Your data is used to provide course access, send important account notifications, process payments via Paymob, and improve the platform. We do not sell your data to third parties." },
  { id: "storage", title: "3. Data Storage & Security", content: "All data is stored on secure servers. Payment data is processed by Paymob and never stored on our servers. Video streams use AES-128 encryption with session-bound tokens." },
  { id: "rights", title: "4. Your Rights", content: "You have the right to access, correct, or delete your personal data at any time. Contact us at the address below to exercise these rights." },
  { id: "cookies", title: "5. Cookies", content: "We use essential cookies for authentication (refresh tokens) and preference storage (locale, theme). No third-party advertising cookies are used." },
  { id: "contact", title: "6. Contact Us", content: "For any privacy-related questions, contact us through the Contact page or email support@eduflow.local." },
];

export const PrivacyPolicy = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="mb-8 text-sm" style={{ color: "var(--color-text-muted)" }}>
          <Link className="no-underline hover:text-brand-600" to={`${prefix}/`}>{t("nav.home")}</Link>
          {" / "}
          <span style={{ color: "var(--color-text-primary)" }}>{t("legal.privacy.title")}</span>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          {t("legal.privacy.title")}
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
          {t("legal.lastUpdated", { date: "April 14, 2026" })}
        </p>

        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <section key={s.id} id={s.id}>
              <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>{s.title}</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{s.content}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};
