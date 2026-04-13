import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { VideoPlayer } from "@/components/shared/VideoPlayer";
import { api } from "@/lib/api";

type PreviewLesson = {
  id: string;
  title: string;
  titleAr: string;
  descriptionHtml: string;
  durationSeconds: number | null;
  videoToken: string;
  hlsUrl: string;
  sortOrder: number;
};

export const Preview = () => {
  const { locale } = useParams();
  const { t, i18n } = useTranslation();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const isAr = i18n.language === "ar";

  const previewQuery = useQuery({
    queryKey: ["lesson-preview"],
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await api.get<PreviewLesson>("/lessons/preview");
      return response.data;
    }
  });

  if (previewQuery.isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: "var(--color-page)" }}>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (previewQuery.isError || !previewQuery.data) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6" style={{ backgroundColor: "var(--color-page)" }}>
        <div
          className="w-full max-w-md rounded-2xl border p-8 text-center shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
            {isAr ? "لا تتوفر معاينة حالياً" : "Preview not available"}
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {isAr ? "لم يتم نشر أي دروس بعد." : "No lessons have been published yet."}
          </p>
          <Link
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:bg-brand-700"
            to={`${prefix}/`}
          >
            {t("actions.backToHome")}
          </Link>
        </div>
      </div>
    );
  }

  const lesson = previewQuery.data;
  const title = isAr && lesson.titleAr ? lesson.titleAr : lesson.title;

  return (
    <main className="min-h-dvh px-4 py-8 sm:px-6" style={{ backgroundColor: "var(--color-page)" }}>
      <section className="mx-auto max-w-4xl space-y-5">

        {/* Preview banner */}
        <div
          className="rounded-2xl border p-4 shadow-card"
          style={{ backgroundColor: "var(--color-brand-muted)", borderColor: "rgba(235,32,39,0.2)" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                ▶
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
                  {t("preview.freePreview")}
                </p>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {t("preview.forEveryone")}
                </p>
              </div>
            </div>
            <Link
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white no-underline shadow-sm transition-all hover:bg-brand-700"
              to={`${prefix}/register`}
            >
              {t("preview.registerFree")}
            </Link>
          </div>
        </div>

        {/* Lesson title */}
        <div
          className="rounded-2xl border p-5 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
            {t("preview.firstLesson")}
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {title}
          </h1>
          {lesson.durationSeconds ? (
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
              {Math.floor(lesson.durationSeconds / 60)}m {lesson.durationSeconds % 60}s
            </p>
          ) : null}
        </div>

        {/* Video player — no watermark for preview */}
        <VideoPlayer
          lessonTitle={title}
          sourceUrl={lesson.hlsUrl}
          watermark={null}
          initialPositionSeconds={0}
          onProgress={() => {/* Preview — no progress tracking */}}
          onTokenExpired={() => {/* Preview token; user must enroll to continue */}}
        />

        {/* CTA after video */}
        <div
          className="relative overflow-hidden rounded-2xl border p-8 text-center shadow-elevated"
          style={{ backgroundColor: "var(--color-invert)", borderColor: "transparent" }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(ellipse 60% 80% at 50% 120%, rgba(235,32,39,0.3), transparent)" }}
          />
          <p className="relative text-xs font-bold uppercase tracking-widest opacity-60" style={{ color: "var(--color-text-invert)" }}>
            {t("preview.likedIt")}
          </p>
          <h2 className="relative mt-3 text-xl font-bold tracking-tight" style={{ color: "var(--color-text-invert)" }}>
            {t("preview.getFullAccess")}
          </h2>
          <p className="relative mt-2 text-sm opacity-70" style={{ color: "var(--color-text-invert)" }}>
            {t("preview.onePayment")}
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3">
            <Link
              className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white no-underline transition-all hover:bg-brand-500 shadow-sm"
              to={`${prefix}/checkout`}
            >
              {t("preview.getAccessCta")}
            </Link>
            <Link
              className="rounded-xl border border-white/20 px-6 py-3 text-sm font-medium text-white no-underline transition-all hover:bg-white/10"
              to={`${prefix}/register`}
            >
              {t("landing.createAccount")}
            </Link>
          </div>
        </div>

        {/* Description */}
        {lesson.descriptionHtml ? (
          <div
            className="rounded-2xl border p-5 shadow-card"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
              {t("lesson.notes")}
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
              {lesson.descriptionHtml}
            </p>
          </div>
        ) : null}

      </section>
    </main>
  );
};
