import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { aboutStatsAr } from "@/lib/public-page-content";

export const About = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";

  return (
    <main className="reference-page">
      <div className="reference-shell">
        <header className="reference-hero">
          <span className="reference-badge">
            <span className="reference-dot" aria-hidden="true" />
            عن المدرب والـ workflow
          </span>
          <h1 className="reference-title">
            مش كورس أدوات. <span className="accent-word">نظام تنفيذ كامل</span>
          </h1>
          <p className="reference-subtitle">
            يوسف عبد الله بيشرح المسار العملي لتحويل فكرة خام إلى تطبيق منشور: تخطيط، UI direction، تنفيذ بالذكاء الاصطناعي، مراجعة، أمان، SEO، Docker، ونشر production.
          </p>
        </header>

        <section className="reference-card p-8 md:p-10">
          <div className="grid gap-8 md:grid-cols-[220px_1fr] md:items-start">
            <div className="reference-card reference-card--lime grid aspect-square place-items-center p-6 text-center">
              <div>
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl border text-3xl font-black" style={{ borderColor: "var(--color-border-strong)", color: "var(--color-brand-text)" }}>
                  AI
                </div>
                <p className="mt-5 text-sm font-black">Yousef Abdallah</p>
                <p className="mt-1 text-xs" style={{ color: "var(--color-text-muted)" }}>AI Workflow Builder</p>
              </div>
            </div>

            <div>
              <h2 className="m-0 font-display text-3xl font-black">الفلسفة بسيطة: الـ AI قوي لما الـ workflow واضح.</h2>
              <p className="mt-4 leading-8" style={{ color: "var(--color-text-secondary)" }}>
                بدل ما تبدأ بـ prompt عشوائي وتستنى الحظ، الكورس بيخليك تمشي في نظام واضح: تفهم المشكلة، تكتب PRD، تطلع اتجاه UI، تنفذ بالـ AI، تراجع وتختبر، تقوّي الأمان والأداء، ثم تنشر المشروع بثقة.
              </p>
              <div className="mt-6 grid gap-3">
                {[
                  "شرح عربي عملي بعيد عن الكلام النظري.",
                  "تركيز على production وليس مجرد demo.",
                  "أدوات واضحة: PRD، Spec Kit، Claude Code، Codex، Docker، SEO، CI/CD."
                ].map((item) => (
                  <div className="flex items-start gap-3" key={item}>
                    <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-brand-600" />
                    <span style={{ color: "var(--color-text-secondary)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="inner-stat-strip">
          {aboutStatsAr.map((stat) => (
            <div className="inner-stat" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link className="reference-button" to={`${prefix}/pricing`}>
            احجز مكانك
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link className="reference-button-secondary" to={`${prefix}/preview`}>
            شاهد المعاينة المجانية
          </Link>
        </div>
      </div>
    </main>
  );
};
