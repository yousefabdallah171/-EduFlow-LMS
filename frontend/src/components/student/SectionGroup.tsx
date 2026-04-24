import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { LessonCard } from "./LessonCard";
import { SkeletonLessonCard } from "@/components/skeletons";

interface Lesson {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  durationSeconds?: number;
  sortOrder: number;
}

interface SectionGroupProps {
  sectionId: string;
  sectionTitleEn: string;
  sectionTitleAr: string;
  lessons: Lesson[];
  locale?: string;
  defaultExpanded?: boolean;
}

export const SectionGroup = ({
  sectionId,
  sectionTitleEn,
  sectionTitleAr,
  lessons,
  locale = "en",
  defaultExpanded = true
}: SectionGroupProps) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const initialRenderCount = 12;
  const incrementBy = 12;
  const [visibleCount, setVisibleCount] = useState(() => Math.min(lessons.length, initialRenderCount));
  const sectionTitle = locale === "ar" ? sectionTitleAr : sectionTitleEn;
  const totalMinutes = Math.round(lessons.reduce((sum, lesson) => sum + (lesson.durationSeconds ?? 0), 0) / 60);
  const visibleLessons = useMemo(() => lessons.slice(0, visibleCount), [lessons, visibleCount]);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    setVisibleCount((current) => Math.min(lessons.length, Math.max(current, initialRenderCount)));
  }, [isExpanded, lessons.length]);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    if (visibleCount >= lessons.length) {
      return;
    }

    const node = sentinelRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        setVisibleCount((current) => Math.min(lessons.length, current + incrementBy));
      },
      { rootMargin: "240px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [incrementBy, isExpanded, lessons.length, visibleCount]);

  return (
    <section
      id={`section-${sectionId}`}
      className="overflow-hidden rounded-[30px] border shadow-card"
      style={{
        background:
          "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 98%, white), color-mix(in oklab, var(--color-surface-2) 86%, transparent))",
        borderColor: "var(--color-border)"
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between gap-4 p-5 text-start transition-colors hover:bg-surface2 sm:p-6"
        style={{ backgroundColor: "transparent" }}
      >
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-600/10 text-sm font-bold text-brand-600 shadow-sm">
            {String(lessons.length).padStart(2, "0")}
          </div>
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ backgroundColor: "var(--color-brand-muted)", color: "var(--color-brand)" }}>
                <Sparkles className="h-3 w-3" />
                {t("lessons.learningPhaseLabel")}
              </span>
            </div>
            <h2 className="font-display text-lg font-semibold sm:text-xl" style={{ color: "var(--color-text-primary)" }}>
              {sectionTitle}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
              <span>{t("lessons.lessonCount", { count: lessons.length })}</span>
              <span>{t("lessons.aboutMinutesShort", { minutes: totalMinutes })}</span>
            </div>
          </div>
        </div>
        <ChevronDown
          size={20}
          className="transition-transform"
          style={{
            color: "var(--color-text-muted)",
            transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)"
          }}
        />
      </button>

      {isExpanded ? (
        <div className="grid grid-cols-1 gap-4 border-t p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3" style={{ borderColor: "var(--color-border)" }}>
          {visibleLessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              id={lesson.id}
              titleEn={lesson.titleEn}
              titleAr={lesson.titleAr}
              descriptionEn={lesson.descriptionEn}
              descriptionAr={lesson.descriptionAr}
              durationSeconds={lesson.durationSeconds}
              sectionName={sectionTitle}
              locale={locale}
            />
          ))}

          {visibleCount < lessons.length ? (
            <div ref={sentinelRef} className="contents" aria-hidden="true">
              <SkeletonLessonCard />
              <SkeletonLessonCard />
              <SkeletonLessonCard />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};
