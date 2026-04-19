import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Clock3, PlayCircle } from "lucide-react";

interface LessonCardProps {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  durationSeconds?: number;
  sectionName?: string;
  completionProgress?: number;
  locale?: string;
}

export const LessonCard = ({
  id,
  titleEn,
  titleAr,
  descriptionEn,
  descriptionAr,
  durationSeconds,
  sectionName,
  completionProgress,
  locale = "en"
}: LessonCardProps) => {
  const { t } = useTranslation();
  const { locale: routeLocale } = useParams();
  const prefix = routeLocale === "en" || routeLocale === "ar" ? `/${routeLocale}` : "";
  const title = locale === "ar" ? titleAr : titleEn;
  const description = locale === "ar" ? descriptionAr : descriptionEn;

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Link
      to={`${prefix}/lessons/${id}`}
      className="group flex h-full flex-col rounded-[24px] border p-5 no-underline transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)"
      }}
    >
      <div className="flex h-full flex-col space-y-4">
        {sectionName && (
          <span
            className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{
              backgroundColor: "var(--color-brand-muted)",
              color: "var(--color-brand)"
            }}
          >
            {sectionName}
          </span>
        )}

        <h3 className="font-display text-base font-semibold leading-snug transition-colors group-hover:text-brand-600" style={{ color: "var(--color-text-primary)" }}>
          {title}
        </h3>

        {description && (
          <p className="line-clamp-3 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
            {description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
          {durationSeconds ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              <Clock3 className="h-3.5 w-3.5" />
              {formatDuration(durationSeconds)}
            </span>
          ) : <span />}

          {completionProgress !== undefined && (
            <div className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
              {completionProgress === 100 ? t("common.completed") : `${completionProgress}%`}
            </div>
          )}
          {completionProgress === undefined ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600">
              <PlayCircle className="h-3.5 w-3.5" />
              {t("actions.start")}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
};
