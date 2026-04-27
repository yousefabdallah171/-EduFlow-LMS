import { ArrowLeft, CheckCircle2, Cpu, FileText, Layers3, Rocket, Search, ShieldCheck, TestTube2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { resolveLocale } from "@/lib/locale";
import { SEO } from "@/components/shared/SEO";
import { SEO_PAGES } from "@/lib/seo-config";

const phaseIcons = [FileText, Layers3, Cpu, TestTube2, ShieldCheck, Search, Rocket] as const;

const roadmapCopy = {
  ar: {
    badge: "ROADMAP / SYLLABUS",
    title: "خريطة دراسة",
    accent: "مفصلة",
    subtitle:
      "مش outline عام. دي مراحل مرتبة من أول الفكرة لحد الـ production، وكل مرحلة لها outputs واضحة وتطبيق عملي.",
    primary: "ارجع للتسعير",
    secondary: "ابدأ الآن",
    outcomesTitle: "هتطلع بإيه؟",
    outcomes: [
      "Artifacts واضحة: PRD + spec + plan + tasks",
      "تنفيذ MVP بخطوات قابلة للإعادة",
      "Review loop (اختبارات + lint + security)",
      "Deployment وDocker أساسيات عملية"
    ]
  },
  en: {
    badge: "ROADMAP / SYLLABUS",
    title: "A detailed",
    accent: "roadmap",
    subtitle:
      "Not a generic outline. A step-by-step path from idea to production with clear outputs and hands-on practice.",
    primary: "Back to pricing",
    secondary: "Get started",
    outcomesTitle: "What you leave with",
    outcomes: [
      "Clear artifacts: PRD + spec + plan + tasks",
      "A repeatable MVP implementation flow",
      "A review loop (tests + lint + security)",
      "Practical Docker + deployment basics"
    ]
  }
};

const phases = [
  { label: "Phase 1", title: "PRD + Research", bodyEn: "Define problem, market, MVP.", bodyAr: "تحديد المشكلة والسوق وMVP." },
  { label: "Phase 2", title: "Spec + Plan", bodyEn: "Turn idea into executable plan.", bodyAr: "تحويل الفكرة لمواصفات وخطة تنفيذ." },
  { label: "Phase 3", title: "Build MVP", bodyEn: "Implement backend + frontend.", bodyAr: "تنفيذ backend + frontend." },
  { label: "Phase 4", title: "Testing", bodyEn: "Unit, integration, and E2E for P0.", bodyAr: "اختبارات للمسارات الأساسية." },
  { label: "Phase 5", title: "Security", bodyEn: "Auth, RBAC, rate limits, hardening.", bodyAr: "تأمين: auth, RBAC, hardening." },
  { label: "Phase 6", title: "SEO + Growth", bodyEn: "Public pages, tracking, conversion.", bodyAr: "صفحات عامة + تتبع + تحويل." },
  { label: "Phase 7", title: "Docker + Production", bodyEn: "Deploy with confidence.", bodyAr: "تشغيل ونشر وإطلاق." }
];

export const Roadmap = () => {
  const { locale } = useParams();
  const resolved = resolveLocale(locale);
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const isAr = resolved === "ar";
  const copy = roadmapCopy[resolved];

  return (
    <main className="reference-page">
      <SEO page={SEO_PAGES.roadmap} />
      <div className="reference-shell reference-shell--narrow">
        <header className="reference-hero">
          <span className="reference-badge">
            <span className="reference-dot" aria-hidden="true" />
            {copy.badge}
          </span>
          <h1 className="reference-title">
            {copy.title} <span className="accent-word">{copy.accent}</span>
          </h1>
          <p className="reference-subtitle">{copy.subtitle}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link className="reference-button-secondary" to={`${prefix}/pricing`}>
              {copy.primary}
            </Link>
            <Link className="reference-button" to={`${prefix}/register`}>
              {copy.secondary}
              <ArrowLeft className="icon-dir h-4 w-4" />
            </Link>
          </div>
        </header>

        <section className="reference-card mt-10 p-6 md:p-8">
          <h2 className="m-0 font-display text-2xl font-black">{copy.outcomesTitle}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {copy.outcomes.map((item) => (
              <div className="flex items-start gap-3" key={item}>
                <CheckCircle2 className="mt-1 h-5 w-5 flex-shrink-0 text-brand-600" />
                <span style={{ color: "var(--color-text-secondary)" }}>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 space-y-3">
          {phases.map((phase, index) => {
            const Icon = phaseIcons[index] ?? Rocket;
            return (
              <article className="reference-card p-6" key={phase.title}>
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-2xl text-brand-600" style={{ backgroundColor: "var(--color-brand-muted)" }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "var(--color-text-muted)" }}>
                      {phase.label}
                    </p>
                    <p className="mt-2 text-base font-black" style={{ color: "var(--color-text-primary)" }}>{phase.title}</p>
                    <p className="mt-2 text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
                      {isAr ? phase.bodyAr : phase.bodyEn}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
};

