import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

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
      to={`/lessons/${id}`}
      className="rounded-lg border p-4 transition-all hover:shadow-md hover:border-blue-400"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)"
      }}
    >
      <div className="space-y-3">
        {sectionName && (
          <span
            className="text-xs font-semibold px-2 py-1 rounded-full inline-block"
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              color: "rgb(59, 130, 246)"
            }}
          >
            {sectionName}
          </span>
        )}

        <h3 className="font-semibold text-sm leading-snug" style={{ color: "var(--color-text-primary)" }}>
          {title}
        </h3>

        {description && (
          <p
            className="text-xs line-clamp-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {description}
          </p>
        )}

        <div className="flex items-center justify-between pt-2">
          {durationSeconds && (
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {formatDuration(durationSeconds)}
            </span>
          )}

          {completionProgress !== undefined && (
            <div className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
              {completionProgress === 100 ? "✓ Completed" : `${completionProgress}%`}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};
