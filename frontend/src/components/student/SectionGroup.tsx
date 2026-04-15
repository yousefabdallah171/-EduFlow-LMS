import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { LessonCard } from "./LessonCard";

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
  sectionTitleEn,
  sectionTitleAr,
  lessons,
  locale = "en",
  defaultExpanded = true
}: SectionGroupProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const sectionTitle = locale === "ar" ? sectionTitleAr : sectionTitleEn;

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 rounded-lg border transition-colors hover:bg-opacity-50"
        style={{
          backgroundColor: "var(--color-surface-2)",
          borderColor: "var(--color-border)"
        }}
      >
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-lg" style={{ color: "var(--color-text-primary)" }}>
            {sectionTitle}
          </h2>
          <span
            className="text-sm font-medium px-2 py-1 rounded-full"
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text-secondary)"
            }}
          >
            {lessons.length}
          </span>
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

      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4">
          {lessons.map((lesson) => (
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
        </div>
      )}
    </div>
  );
};
