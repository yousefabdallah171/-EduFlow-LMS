import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Progress } from "@/components/ui/progress";
import { StudentShell } from "@/components/layout/StudentShell";
import { useAuth } from "@/hooks/useAuth";
import { useEnrollment } from "@/hooks/useEnrollment";
import { api } from "@/lib/api";
import { demoLessons, isDemoMode } from "@/lib/demo";
import { formatDate, pickLocalizedText, resolveLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

type LessonSummary = {
  id: string;
  title: string;
  titleEn?: string;
  titleAr?: string | null;
  durationSeconds: number | null;
  sortOrder: number;
  isUnlocked: boolean;
  unlocksAt: string | null;
  completedAt: string | null;
  lastPositionSeconds: number;
};

type PublicLesson = {
  id: string;
  title: string;
  titleAr: string | null;
  durationSeconds: number | null;
  sortOrder: number;
};

type CourseInfo = {
  title: string;
  titleEn?: string;
  titleAr?: string | null;
  descriptionHtml?: string;
  descriptionHtmlEn?: string;
  descriptionHtmlAr?: string;
  priceEgp: number;
  currency: string;
  lessonCount: number;
  lessons: PublicLesson[];
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

/* ─── Public course overview for non-authenticated visitors ─── */
const PublicCourseView = ({ prefix, t, isAr }: { prefix: string; t: (k: string, opts?: Record<string, unknown>) => string; isAr: boolean }) => {
  const navigate = useNavigate();

  const courseQuery = useQuery({
    queryKey: ["course-summary"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await api.get<CourseInfo>("/course");
      return response.data;
    }
  });

  const course = courseQuery.data;
  const courseTitle = pickLocalizedText(isAr ? "ar" : "en", course?.titleEn ?? course?.title, course?.titleAr);

  return (
    <main className="min-h-dvh px-4 py-6 sm:px-6" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-5 md:grid-cols-[240px_minmax(0,1fr)] md:items-start">

          {/* ── Sidebar ── */}
          <aside
            className="hidden rounded-2xl border p-3 shadow-card md:block"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="mb-3 rounded-xl p-3 text-center" style={{ backgroundColor: "var(--color-brand-muted)" }}>
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 shadow-sm">
                <span className="text-lg font-bold text-white">E</span>
              </div>
              <p className="mt-2 text-xs font-bold text-brand-600">EduFlow</p>
            </div>

            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              {isAr ? "الإجراءات" : "Actions"}
            </p>
            <nav className="space-y-0.5">
              {[
                { icon: "◎", label: isAr ? "احصل على الدورة" : "Get course access", href: `${prefix}/checkout`, accent: true },
                { icon: "▶", label: isAr ? "معاينة مجانية" : "Watch free preview", href: `${prefix}/preview` },
                { icon: "→", label: isAr ? "تسجيل الدخول" : "Log in", href: `${prefix}/login` },
                { icon: "+", label: isAr ? "إنشاء حساب" : "Create account", href: `${prefix}/register` }
              ].map((item) => (
                <Link
                  key={item.label}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium no-underline transition-colors",
                    item.accent ? "bg-brand-600 text-white hover:bg-brand-700" : "hover:bg-surface2"
                  )}
                  style={item.accent ? {} : { color: "var(--color-text-secondary)" }}
                  to={item.href}
                >
                  <span className={cn("text-base leading-none", item.accent ? "opacity-80" : "text-brand-600 opacity-70")}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ))}
            </nav>

            {course ? (
              <div className="mt-4 rounded-xl p-3" style={{ backgroundColor: "var(--color-surface-2)" }}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                  {isAr ? "سعر الدورة" : "Course price"}
                </p>
                <p className="mt-1 text-2xl font-bold text-brand-600">
                  {course.priceEgp} <span className="text-sm">{course.currency}</span>
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {isAr ? `${course.lessonCount} درس` : `${course.lessonCount} lessons`}
                </p>
              </div>
            ) : null}
          </aside>

          {/* ── Main content ── */}
          <div className="space-y-5">

            {/* Hero */}
            <div
              className="overflow-hidden rounded-2xl border shadow-card"
              style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <div className="p-6">
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600">EduFlow</p>
                <h1 className="mt-1.5 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                  {courseTitle || (isAr ? "مكتبة الدروس المحمية" : "Protected Lesson Library")}
                </h1>
                <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  {isAr
                    ? "سجّل الدخول أو اشترِ الدورة للوصول إلى جميع الدروس."
                    : "Log in or purchase the course to unlock all lessons."}
                </p>

                {/* Free preview banner */}
                <div
                  className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
                  style={{ backgroundColor: "var(--color-brand-muted)", borderColor: "rgba(235,32,39,0.2)" }}
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
                      {isAr ? "معاينة مجانية" : "Free preview"}
                    </p>
                    <p className="mt-0.5 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                      {isAr ? "شاهد الدرس الأول مجاناً بدون تسجيل" : "Watch lesson 1 free — no login required"}
                    </p>
                  </div>
                  <Link
                    className="flex-shrink-0 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white no-underline shadow-sm transition-all hover:bg-brand-700"
                    to={`${prefix}/preview`}
                  >
                    {isAr ? "شاهد المعاينة" : "Watch preview"}
                  </Link>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:bg-brand-700"
                    to={`${prefix}/checkout`}
                  >
                    {isAr ? "احصل على الدورة" : "Get course access"}
                  </Link>
                  <Link
                    className="rounded-xl border px-5 py-2.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                    style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                    to={`${prefix}/login`}
                  >
                    {t("actions.logIn")}
                  </Link>
                </div>
              </div>
            </div>

            {/* Lesson list — all locked, click → login */}
            {courseQuery.isLoading ? (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{t("common.loading")}</p>
            ) : course?.lessons && course.lessons.length > 0 ? (
              <div
                className="rounded-2xl border shadow-card"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
                    {isAr ? "محتوى الدورة" : "Course content"}
                  </p>
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
                    {course.lessons.length} {isAr ? "درس" : "lessons"}
                  </span>
                </div>

                <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {course.lessons.map((lesson, idx) => {
                    const title = isAr && lesson.titleAr ? lesson.titleAr : lesson.title;
                    const isFirst = idx === 0;
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start transition-colors hover:bg-surface2"
                        onClick={() => {
                          if (isFirst) {
                            navigate(`${prefix}/preview`);
                          } else {
                            navigate(`${prefix}/login`);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: isFirst ? "var(--color-brand-muted)" : "var(--color-surface-2)",
                              color: isFirst ? "var(--color-brand)" : "var(--color-text-muted)"
                            }}
                          >
                            {isFirst ? "▶" : "🔒"}
                          </span>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                              {title}
                            </p>
                            <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                              {isFirst
                                ? (isAr ? "مجاني — شاهد الآن" : "Free — watch now")
                                : (isAr ? "🔒 يتطلب التسجيل" : "🔒 Login required")}
                              {lesson.durationSeconds ? ` - ${formatDuration(lesson.durationSeconds)}` : ""}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-brand-600">
                          {isFirst ? (isAr ? "معاينة" : "Preview") : (isAr ? "تسجيل الدخول" : "Log in")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Sign up CTA */}
            <p className="text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
              {isAr ? "هل أنت جديد؟" : "New here?"}{" "}
              <Link className="font-semibold text-brand-600 no-underline hover:underline" to={`${prefix}/register`}>
                {isAr ? "إنشاء حساب مجاني" : "Create a free account"}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

/* ─── Student Dashboard (logged-in view) ─── */
export const Course = () => {
  const { locale } = useParams();
  const { t } = useTranslation();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const currentLocale = resolveLocale(locale);
  const isAr = currentLocale === "ar";
  const demo = isDemoMode();
  const { user } = useAuth();
  const { statusQuery } = useEnrollment();
  const isEnrolled = statusQuery.data?.enrolled && statusQuery.data?.status === "ACTIVE";

  const lessonsQuery = useQuery({
    queryKey: ["course-lessons"],
    enabled: Boolean(isEnrolled || demo),
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      if (demo) {
        return demoLessons.map((lesson) => ({
          ...lesson,
          titleEn: lesson.title,
          titleAr: null
        }));
      }
      const response = await api.get<{ lessons: LessonSummary[] }>("/lessons");
      return response.data.lessons;
    }
  });

  const completedCount = lessonsQuery.data?.filter((l) => l.completedAt).length ?? 0;
  const totalCount = lessonsQuery.data?.length ?? 0;
  const completionPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextLesson = lessonsQuery.data?.find((l) => l.isUnlocked && !l.completedAt);
  const lastLesson = lessonsQuery.data?.filter((l) => l.lastPositionSeconds > 0).at(-1);

  // Show public view if not logged in
  if (!user && !demo) {
    return <PublicCourseView prefix={prefix} t={t} isAr={isAr} />;
  }

  return (
    <StudentShell>
      <>

            {/* Welcome header */}
            <div
              className="rounded-2xl border p-6 shadow-card"
              style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              {user ? (
                <>
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
                    {isAr ? "مرحباً بك" : "Welcome back"}
                  </p>
                  <h1 className="mt-1.5 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                    {user.fullName}
                  </h1>
                </>
              ) : (
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                  {isAr ? "مكتبة الدروس" : "Course library"}
                </h1>
              )}
              <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {isEnrolled
                  ? (isAr ? "دورتك نشطة — كل الدروس في انتظارك." : "Your course is active — all lessons are ready.")
                  : (isAr ? "اشترِ الدورة لفتح جميع الدروس." : "Purchase the course to unlock all lessons.")}
              </p>
            </div>

            {/* Stats row */}
            {isEnrolled && totalCount > 0 ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border p-4 shadow-card" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                    {t("course.completion")}
                  </p>
                  <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{completionPct}%</p>
                  <Progress className="mt-2 h-1.5" value={completionPct} />
                </div>
                <div className="rounded-2xl border p-4 shadow-card" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                    {t("course.completedLessons")}
                  </p>
                  <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{completedCount}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {t("course.outOf", { total: totalCount })}
                  </p>
                </div>
                <div
                  className="flex flex-col justify-between rounded-2xl border p-4 shadow-card"
                  style={{ backgroundColor: "var(--color-invert)", borderColor: "transparent" }}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-60" style={{ color: "var(--color-text-invert)" }}>
                    {t("course.playbackPolicy")}
                  </p>
                  <p className="mt-3 text-xs font-medium leading-relaxed" style={{ color: "var(--color-text-invert)" }}>
                    {t("course.tokenPolicy")}
                  </p>
                </div>
              </div>
            ) : null}

            {/* Not enrolled state */}
            {!statusQuery.isLoading && !isEnrolled ? (
              <div
                className="rounded-2xl border p-6 shadow-card"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <div
                  className="rounded-xl border border-dashed p-6 text-center"
                  style={{ borderColor: "var(--color-border-strong)" }}
                >
                  <p className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
                    {t("course.noAccess")}
                  </p>
                  <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {t("course.purchaseToUnlock")}
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <Link
                      className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:bg-brand-700"
                      to={`${prefix}/checkout`}
                    >
                      {t("course.getAccess")}
                    </Link>
                    <Link
                      className="rounded-xl border px-5 py-2.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
                      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                      to={`${prefix}/preview`}
                    >
                      {t("course.watchFreeLesson")}
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Lesson list */}
            {isEnrolled ? (
              <div
                id="lessons"
                className="rounded-2xl border shadow-card"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
                    {isAr ? "الدروس" : "Lessons"}
                  </p>
                  {lessonsQuery.isLoading ? (
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{t("common.loading")}</span>
                  ) : null}
                </div>

                {lessonsQuery.isError ? (
                  <p className="p-5 text-sm text-red-500">
                    {isAr ? "تعذّر تحميل الدروس." : "Unable to load lessons."}
                  </p>
                ) : null}

                <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {lessonsQuery.data?.map((lesson, idx) => {
                    const isResume = lesson.lastPositionSeconds > 0 && !lesson.completedAt;
                    return (
                      <div
                        key={lesson.id}
                        className={cn(
                          "flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors",
                          lesson.isUnlocked ? "hover:bg-surface2" : "opacity-60"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                            style={{
                              backgroundColor: lesson.completedAt
                                ? "rgba(34,197,94,0.12)"
                                : lesson.isUnlocked
                                  ? "var(--color-brand-muted)"
                                  : "var(--color-surface-2)",
                              color: lesson.completedAt
                                ? "rgb(21,128,61)"
                                : lesson.isUnlocked
                                  ? "var(--color-brand)"
                                  : "var(--color-text-muted)"
                            }}
                          >
                            {lesson.completedAt ? "✓" : lesson.isUnlocked ? idx + 1 : "🔒"}
                          </span>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                              {pickLocalizedText(currentLocale, lesson.titleEn ?? lesson.title, lesson.titleAr)}
                            </p>
                            <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                              {lesson.completedAt
                                ? (isAr ? "✓ مكتمل" : "✓ Completed")
                                : isResume
                                  ? (isAr ? `متابعة من ${lesson.lastPositionSeconds}ث` : `Resume from ${lesson.lastPositionSeconds}s`)
                                  : !lesson.isUnlocked
                                    ? (isAr
                                        ? `يُفتح ${lesson.unlocksAt ? formatDate(lesson.unlocksAt, currentLocale) : "قريباً"}`
                                        : `Unlocks ${lesson.unlocksAt ? formatDate(lesson.unlocksAt, currentLocale) : "soon"}`)
                                    : t("course.notStarted")}
                              {lesson.durationSeconds ? ` - ${formatDuration(lesson.durationSeconds)}` : ""}
                            </p>
                          </div>
                        </div>

                        {lesson.isUnlocked ? (
                          <Link
                            className="rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-bold text-white no-underline shadow-sm transition-all hover:bg-brand-700"
                            to={`${prefix}/lessons/${lesson.id}`}
                          >
                            {lesson.completedAt
                              ? t("actions.rewatch")
                              : isResume
                                ? t("actions.resume")
                                : t("actions.start")}
                          </Link>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Continue learning quick-access */}
            {isEnrolled && (nextLesson ?? lastLesson) ? (
              <div
                className="rounded-2xl border p-5 shadow-card"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
                  {t("course.continueLearning")}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {pickLocalizedText(currentLocale, (nextLesson ?? lastLesson)?.titleEn ?? (nextLesson ?? lastLesson)?.title, (nextLesson ?? lastLesson)?.titleAr)}
                  </p>
                  <Link
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:bg-brand-700"
                    to={`${prefix}/lessons/${(nextLesson ?? lastLesson)!.id}`}
                  >
                    {t("actions.continue")}
                    <span className="icon-dir">→</span>
                  </Link>
                </div>
              </div>
            ) : null}
      </>
    </StudentShell>
  );
};



