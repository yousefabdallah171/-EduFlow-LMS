import { useQuery } from "@tanstack/react-query";
import { BookOpen, Layers3, LockKeyhole, Sparkles, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { StudentShell } from "@/components/layout/StudentShell";
import { PageHeader } from "@/components/shared/PageHeader";
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
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t } = useTranslation();
  const { statusQuery } = useEnrollment();
  const isEnrolled = statusQuery.data?.enrolled && statusQuery.data?.status === "ACTIVE";
  const isAr = currentLocale === "ar";

  const lessonsQuery = useQuery({
    queryKey: ["all-lessons"],
    enabled: Boolean(isEnrolled),
    retry: false,
    queryFn: async () => {
      const response = await api.get<{ sections?: Section[] }>("/lessons/grouped");
      return response.data.sections ?? [];
    }
  });

  const sections = lessonsQuery.data ?? [];
  const totalLessons = sections.reduce((count, section) => count + section.lessons.length, 0);
  const totalSections = sections.length;
  const totalMinutes = Math.round(
    sections.reduce((count, section) => count + section.lessons.reduce((sum, lesson) => sum + (lesson.durationSeconds ?? 0), 0), 0) / 60
  );
  const isLoading = statusQuery.isLoading || lessonsQuery.isLoading;

  return (
    <StudentShell>
      <>
        <PageHeader
          hero
          eyebrow={t("nav.lessons")}
          title={t("lessons.allLessons")}
          description={t("lessons.browseAndLearn")}
          actions={
            isEnrolled ? (
              <Link
                className="inline-flex min-h-11 items-center rounded-xl px-5 py-3 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                style={{ background: "var(--gradient-brand)" }}
                to={`${prefix}/course`}
              >
                {t("course.continueLearning")}
              </Link>
            ) : null
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="dashboard-panel dashboard-panel--accent rounded-[24px] p-4">
            <div className="flex items-center gap-2 text-brand-600">
              <Layers3 className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-[0.16em]">{t("lessons.sectionsCount")}</span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>{totalSections}</p>
          </div>
          <div className="dashboard-panel rounded-[24px] p-4">
            <div className="flex items-center gap-2 text-brand-600">
              <BookOpen className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-[0.16em]">{t("lessons.totalLessons")}</span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>{totalLessons}</p>
          </div>
          <div className="dashboard-panel rounded-[24px] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{t("lessons.learningMode")}</p>
            <p className="mt-2 text-sm font-medium leading-6" style={{ color: "var(--color-text-secondary)" }}>
              {totalMinutes > 0
                ? isAr ? `${t("lessons.learningModeValue")} حوالي ${totalMinutes} دقيقة من المحتوى المتاح الآن.` : `${t("lessons.learningModeValue")} About ${totalMinutes} minutes are currently available.`
                : t("lessons.learningModeValue")}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="dashboard-panel rounded-3xl p-12 text-center">
            <p style={{ color: "var(--color-text-muted)" }}>{t("common.loading")}</p>
          </div>
        ) : !isEnrolled ? (
          <div className="dashboard-panel rounded-3xl p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--color-brand-muted)", color: "var(--color-brand)" }}>
              <LockKeyhole className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>{t("lessons.enrollmentRequired")}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6" style={{ color: "var(--color-text-muted)" }}>{t("course.purchaseToUnlock")}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                className="inline-flex min-h-11 items-center rounded-xl px-5 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
                style={{ background: "var(--gradient-brand)" }}
                to={`${prefix}/checkout`}
              >
                {t("course.getAccess")}
              </Link>
              <Link
                className="inline-flex min-h-11 items-center rounded-xl border px-5 py-2.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                to={`${prefix}/preview`}
              >
                {t("course.watchFreeLesson")}
              </Link>
            </div>
          </div>
        ) : lessonsQuery.isError ? (
          <div className="dashboard-panel rounded-3xl p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-brand)" }}>
              <TriangleAlert className="h-5 w-5" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>{t("lesson.error")}</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>{t("lessons.noLessons")}</p>
          </div>
        ) : sections.length > 0 ? (
          <section className="space-y-6">
            <div className="dashboard-panel rounded-[26px] p-5">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-brand-600" />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {isAr ? "ابدأ من القسم المفتوح أمامك ثم تحرك بالترتيب." : "Start with the open section in front of you, then move in sequence."}
                  </p>
                  <p className="mt-1 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                    {isAr ? "تنظيم الدروس حسب المراحل يجعل كل خطوة تبني على التي قبلها، لذلك ستشعر بالخطة أوضح كلما تقدمت." : "The phase-based structure keeps each lesson building on the previous one, so the roadmap gets clearer as you move forward."}
                  </p>
                </div>
              </div>
            </div>

            {sections.map((section, index) => (
              <SectionGroup
                key={section.id}
                sectionId={section.id}
                sectionTitleEn={section.titleEn}
                sectionTitleAr={section.titleAr}
                lessons={section.lessons}
                locale={currentLocale}
                defaultExpanded={index === 0}
              />
            ))}
          </section>
        ) : (
          <div className="dashboard-panel rounded-3xl p-12 text-center">
            <BookOpen className="mx-auto h-8 w-8 text-brand-600" />
            <p className="mt-3 text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>{t("lessons.noLessons")}</p>
          </div>
        )}
      </>
    </StudentShell>
  );
};
