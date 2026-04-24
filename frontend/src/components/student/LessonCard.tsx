import { memo } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Clock3, PlayCircle } from "lucide-react";

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

export const LessonCard = memo(({
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
  const isAr = locale === "ar";
  const title = isAr ? titleAr : titleEn;
  const description = isAr ? descriptionAr : descriptionEn;

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
      className="group flex h-full flex-col rounded-[26px] border p-5 no-underline transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 96%, white), color-mix(in oklab, var(--color-surface-2) 86%, transparent))",
        borderColor: "var(--color-border)"
      }}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          {sectionName ? (
            <span
              className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{
                backgroundColor: "var(--color-brand-muted)",
                color: "var(--color-brand)"
              }}
            >
              {sectionName}
            </span>
          ) : <span />}

          {completionProgress !== undefined ? (
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{
                backgroundColor:
                  completionProgress === 100 ? "rgb(34 197 94 / 0.12)" : "color-mix(in oklab, var(--color-surface-2) 90%, transparent)",
                color: completionProgress === 100 ? "rgb(21 128 61)" : "var(--color-text-muted)"
              }}
            >
              {completionProgress === 100 ? t("common.completed") : `${completionProgress}%`}
            </span>
          ) : null}
        </div>

        <div className="content-stack gap-3">
          <h3 className="font-display text-base font-semibold leading-snug transition-colors group-hover:text-brand-600" style={{ color: "var(--color-text-primary)" }}>
            {title}
          </h3>

          {description ? (
            <p className="line-clamp-3 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
              {description}
            </p>
          ) : (
            <p className="text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>
              {t("lesson.openHint")}
            </p>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: "var(--color-border)" }}>
          {durationSeconds ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              <Clock3 className="h-3.5 w-3.5" />
              {formatDuration(durationSeconds)}
            </span>
          ) : (
            <span />
          )}

          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600">
            <PlayCircle className="h-3.5 w-3.5" />
            {completionProgress === 100 ? t("actions.rewatch") : t("actions.start")}
            <ArrowRight className="icon-dir h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
});
