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
      style={{ backgroundColor: "var(--color-invert)", borderColor: "color-mix(in srgb, white 10%, transparent)" }}
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <p className="max-w-[68ch] text-sm font-medium leading-6" style={{ color: "var(--color-text-invert)", opacity: 0.9 }}>
          {lessonCount > 0
            ? `Enroll to access all ${lessonCount} lessons`
            : t("preview.ctaBanner")}
        </p>
        <Link
          className="flex min-h-11 flex-shrink-0 items-center rounded-xl px-5 py-2 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
          style={{ background: "var(--gradient-brand)" }}
          to={`${prefix}/checkout`}
        >
          {t("preview.ctaButton")}
        </Link>
      </div>
    </div>
  );
};
