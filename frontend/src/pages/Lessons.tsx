import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { RootLayout } from "@/components/layout/RootLayout";
import { SectionGroup } from "@/components/student/SectionGroup";
import { api } from "@/lib/api";
import { resolveLocale } from "@/lib/locale";
import { useEnrollment } from "@/hooks/useEnrollment";

interface Section {
  id: string;
  titleEn: string;
  titleAr: string;
  lessons: Array<{
    id: string;
    titleEn: string;
    titleAr: string;
    descriptionEn?: string;
    descriptionAr?: string;
    durationSeconds?: number;
    sortOrder: number;
  }>;
}

export const Lessons = () => {
  const { locale } = useParams();
  const currentLocale = resolveLocale(locale);
  const { t } = useTranslation();
  const { statusQuery } = useEnrollment();
  const isEnrolled = statusQuery.data?.enrolled && statusQuery.data?.status === "ACTIVE";

  const lessonsQuery = useQuery({
    queryKey: ["all-lessons"],
    enabled: Boolean(isEnrolled),
    queryFn: async () => {
      const response = await api.get<{ sections: Section[] }>("/lessons");
      return response.data.sections;
    }
  });

  const isLoading = statusQuery.isLoading || lessonsQuery.isLoading;

  if (isLoading) {
    return (
      <RootLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p style={{ color: "var(--color-text-muted)" }}>
            {t("common.loading")}
          </p>
        </div>
      </RootLayout>
    );
  }

  if (!isEnrolled) {
    return (
      <RootLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p style={{ color: "var(--color-text-muted)" }}>
            {t("lesson.notEnrolled")}
          </p>
        </div>
      </RootLayout>
    );
  }

  return (
    <RootLayout>
      <div className="space-y-8 py-8">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
            {t("lessons.allLessons") || "All Lessons"}
          </h1>
          <p style={{ color: "var(--color-text-secondary)" }}>
            {t("lessons.browseAndLearn") || "Browse and learn from our course materials"}
          </p>
        </div>

        {lessonsQuery.data && lessonsQuery.data.length > 0 ? (
          <div className="space-y-6">
            {lessonsQuery.data.map((section) => (
              <SectionGroup
                key={section.id}
                sectionId={section.id}
                sectionTitleEn={section.titleEn}
                sectionTitleAr={section.titleAr}
                lessons={section.lessons}
                locale={currentLocale}
              />
            ))}
          </div>
        ) : (
          <div
            className="rounded-lg border p-12 text-center"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <p style={{ color: "var(--color-text-muted)" }}>
              {t("lessons.noLessons") || "No lessons available yet"}
            </p>
          </div>
        )}
      </div>
    </RootLayout>
  );
};
