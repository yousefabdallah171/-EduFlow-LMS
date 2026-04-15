import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/stores/auth.store";

export const PreviewCTABanner = ({ lessonCount = 0 }: { lessonCount?: number }) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const location = useLocation();
  const segment = location.pathname.split("/")[1];
  const prefix = segment === "en" || segment === "ar" ? `/${segment}` : "";

  // Hide for admin users
  if (user?.role === "ADMIN") return null;

  return (
    <div
      data-testid="preview-cta-banner"
      className="fixed bottom-0 start-0 end-0 z-50 border-t shadow-elevated"
      style={{ backgroundColor: "var(--color-invert)", borderColor: "rgba(255,255,255,0.1)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <p className="text-sm font-medium" style={{ color: "var(--color-text-invert)", opacity: 0.9 }}>
          {lessonCount > 0
            ? `Enroll to access all ${lessonCount} lessons`
            : t("preview.ctaBanner")}
        </p>
        <Link
          className="flex-shrink-0 rounded-lg bg-brand-600 px-5 py-2 text-sm font-bold text-white no-underline transition-all hover:bg-brand-500"
          to={`${prefix}/checkout`}
        >
          {t("preview.ctaButton")}
        </Link>
      </div>
    </div>
  );
};
