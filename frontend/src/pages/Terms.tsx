import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

const sections = [
  { id: "acceptance", title: "1. Acceptance of Terms", content: "By creating an account or purchasing the course, you agree to these Terms of Service. If you disagree, please do not use the platform." },
  { id: "license", title: "2. License & Intellectual Property", content: "Upon purchase, you receive a personal, non-transferable license to access the course content. All videos, materials, and content remain the intellectual property of EduFlow. You may not redistribute, resell, or share access credentials." },
  { id: "payments", title: "3. Payments & Pricing", content: "All payments are processed securely through Paymob. Prices are listed in Egyptian Pounds (EGP) and are inclusive of applicable taxes. Payment is a one-time charge for lifetime access." },
  { id: "refunds", title: "4. Refund Policy", content: "We offer a 30-day money-back guarantee. Refund requests must be submitted within 30 days of purchase. Refunds are processed within 7-14 business days." },
  { id: "content", title: "5. User Conduct", content: "You agree not to share login credentials, record or redistribute course videos, circumvent security measures, or use the platform for any unlawful purpose." },
  { id: "termination", title: "6. Termination", content: "EduFlow reserves the right to terminate accounts that violate these terms. In the event of termination due to a violation, refunds will not be issued." },
  { id: "changes", title: "7. Changes to Terms", content: "We may update these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms." },
];

export const Terms = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="mx-auto max-w-3xl px-6 py-16">
        <nav className="mb-8 text-sm" style={{ color: "var(--color-text-muted)" }}>
          <Link className="no-underline hover:text-brand-600" to={`${prefix}/`}>{t("nav.home")}</Link>
          {" / "}
          <span style={{ color: "var(--color-text-primary)" }}>{t("legal.terms.title")}</span>
        </nav>

        <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
          {t("legal.terms.title")}
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
