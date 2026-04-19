import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

export const NotFound = () => {
  const location = useLocation();
  const segment = location.pathname.split("/")[1];
  const prefix = segment === "en" || segment === "ar" ? `/${segment}` : "";
  const { t } = useTranslation();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "var(--color-page)" }}>
      <p className="text-8xl font-bold opacity-10" style={{ color: "var(--color-brand)" }}>404</p>
      <h1 className="mt-4 text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
        {t("notFound.title")}
      </h1>
      <p className="mt-1 text-lg" style={{ color: "var(--color-text-secondary)" }}>
        {t("notFound.arabic")}
      </p>
      <p className="mt-4 max-w-sm text-sm" style={{ color: "var(--color-text-muted)" }}>
        {t("notFound.message")}
      </p>
      <Link
        className="mt-8 rounded-xl px-6 py-3 text-sm font-bold text-white no-underline transition-all hover:opacity-95"
        style={{ background: "var(--gradient-brand)" }}
        to={`${prefix}/`}
      >
        {t("notFound.backHome")}
      </Link>
    </div>
  );
};
