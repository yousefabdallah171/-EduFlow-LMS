import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const Footer = () => {
  const location = useLocation();
  const segment = location.pathname.split("/")[1];
  const prefix = segment === "en" || segment === "ar" ? `/${segment}` : "";
  const { t } = useTranslation();

  // Don't show footer on admin pages
  if (location.pathname.includes("/admin")) return null;

  return (
    <footer className="border-t px-6 py-10" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between [direction:inherit]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">AI</span>
              <span className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>AI Workflow</span>
            </div>
            <p className="mt-2 text-xs max-w-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              Learn the complete workflow to turn your ideas into production-ready applications with AI.
            </p>
          </div>

          {/* Legal links */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Legal</p>
            <div className="flex flex-col gap-2">
              {[
                { label: t("footer.privacy"), to: "/privacy" },
                { label: t("footer.terms"), to: "/terms" },
                { label: t("footer.refund"), to: "/refund" },
              ].map((link) => (
                <Link
                  key={link.to}
                  className="text-sm no-underline transition-colors hover:text-brand-600"
                  style={{ color: "var(--color-text-secondary)" }}
                  to={`${prefix}${link.to}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Explore links */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Explore</p>
            <div className="flex flex-col gap-2">
              {[
                { label: t("nav.home"),           to: "/" },
                { label: t("about.title"),         to: "/about" },
                { label: t("testimonials.title"),  to: "/testimonials" },
                { label: t("faq.title"),           to: "/faq" },
                { label: t("contact.title"),       to: "/contact" },
                { label: t("pricing.cta"),         to: "/pricing" },
                { label: t("preview.freePreview"), to: "/preview" },
              ].map((link) => (
                <Link
                  key={link.to}
                  className="text-sm no-underline transition-colors hover:text-brand-600"
                  style={{ color: "var(--color-text-secondary)" }}
                  to={`${prefix}${link.to}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Account links */}
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Account</p>
            <div className="flex flex-col gap-2">
              {[
                { label: t("nav.register"),  to: "/register" },
                { label: t("nav.login"),     to: "/login" },
                { label: t("nav.course"),    to: "/course" },
                { label: t("nav.dashboard"), to: "/dashboard" },
                { label: t("nav.profile"),   to: "/profile" },
                { label: t("nav.help"),      to: "/help" },
              ].map((link) => (
                <Link
                  key={link.to}
                  className="text-sm no-underline transition-colors hover:text-brand-600"
                  style={{ color: "var(--color-text-secondary)" }}
                  to={`${prefix}${link.to}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 flex flex-wrap items-center justify-between gap-3" style={{ borderColor: "var(--color-border)" }}>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {t("footer.allRightsReserved")}
          </p>
        </div>
      </div>
    </footer>
  );
};
