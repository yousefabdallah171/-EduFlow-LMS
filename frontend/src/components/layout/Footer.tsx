import { FileText, LifeBuoy, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks/useAuth";

export const Footer = () => {
  const location = useLocation();
  const segment = location.pathname.split("/")[1];
  const prefix = segment === "en" || segment === "ar" ? `/${segment}` : "";
  const { t } = useTranslation();
  const { user } = useAuth();
  const isStudent = user?.role === "STUDENT";

  if (location.pathname.includes("/admin")) return null;

  const legalLinks = [
    { label: t("footer.privacy"), to: "/privacy" },
    { label: t("footer.terms"), to: "/terms" },
    { label: t("footer.refund"), to: "/refund" }
  ];

  const exploreLinks = [
    { label: t("nav.home"), to: "/" },
    { label: t("about.title"), to: "/about" },
    { label: t("testimonials.title"), to: "/testimonials" },
    { label: t("faq.title"), to: "/faq" },
    { label: t("contact.title"), to: "/contact" },
    { label: t("pricing.cta"), to: "/pricing" },
    { label: t("preview.freePreview"), to: "/preview" }
  ];

  const accountLinks = isStudent
    ? [
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.course"), to: "/course" },
        { label: t("student.shell.progress"), to: "/progress" },
        { label: t("student.shell.notes"), to: "/notes" },
        { label: t("student.shell.downloads"), to: "/downloads" },
        { label: t("student.shell.orders"), to: "/orders" },
        { label: t("nav.profile"), to: "/profile" },
        { label: t("nav.help"), to: "/help" }
      ]
    : [
        { label: t("nav.register"), to: "/register" },
        { label: t("nav.login"), to: "/login" },
        { label: t("nav.course"), to: "/course" },
        { label: t("nav.dashboard"), to: "/dashboard" },
        { label: t("nav.profile"), to: "/profile" },
        { label: t("nav.help"), to: "/help" }
      ];

  const primaryCta = isStudent
    ? { label: t("nav.dashboard"), to: "/dashboard" }
    : { label: t("nav.getStarted"), to: "/register" };

  const secondaryCta = isStudent
    ? { label: t("nav.course"), to: "/course" }
    : { label: t("preview.freePreview"), to: "/preview" };

  return (
    <footer className="px-4 pb-8 pt-14 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div
          className="overflow-hidden rounded-[32px] border shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="rounded-3xl border p-5" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-2)" }}>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{t("footer.quickStart")}</p>
              <p className="font-display mt-3 text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {t("footer.quickStartTitle")}
              </p>
              <p className="mt-2 text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
                {t("footer.quickStartBody")}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  className="rounded-2xl px-4 py-2.5 text-sm font-semibold text-white no-underline transition-all"
                  style={{
                    background: "var(--gradient-brand)",
                    boxShadow: "0 12px 24px color-mix(in oklab, var(--color-brand) 16%, transparent)"
                  }}
                  to={`${prefix}${primaryCta.to}`}
                >
                  {primaryCta.label}
                </Link>
                <Link
                  className="rounded-2xl border px-4 py-2.5 text-sm font-medium no-underline transition-colors hover:bg-surface"
                  style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  to={`${prefix}${secondaryCta.to}`}
                >
                  {secondaryCta.label}
                </Link>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-3">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand-600" />
                  <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "var(--color-text-muted)" }}>
                    {t("footer.legal")}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {legalLinks.map((link) => (
                    <Link
                      key={link.to}
                      className="block text-sm no-underline transition-colors hover:text-brand-600"
                      style={{ color: "var(--color-text-secondary)" }}
                      to={`${prefix}${link.to}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-brand-600" />
                  <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "var(--color-text-muted)" }}>
                    {t("footer.explore")}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {exploreLinks.map((link) => (
                    <Link
                      key={link.to}
                      className="block text-sm no-underline transition-colors hover:text-brand-600"
                      style={{ color: "var(--color-text-secondary)" }}
                      to={`${prefix}${link.to}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-4 flex items-center gap-2">
                  <LifeBuoy className="h-4 w-4 text-brand-600" />
                  <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "var(--color-text-muted)" }}>
                    {t("footer.account")}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {accountLinks.map((link) => (
                    <Link
                      key={link.to}
                      className="block text-sm no-underline transition-colors hover:text-brand-600"
                      style={{ color: "var(--color-text-secondary)" }}
                      to={`${prefix}${link.to}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t px-6 py-5 sm:px-8" style={{ borderColor: "var(--color-border)" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {t("footer.copyright", { year: new Date().getFullYear() })}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {t("footer.allRightsReserved")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
