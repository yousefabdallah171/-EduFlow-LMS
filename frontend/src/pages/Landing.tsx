import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import {
  ArrowLeft,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { resolveLocale } from "@/lib/locale";
import { contactInfo } from "@/lib/public-page-content";
import { getPublicTrustCopy } from "@/lib/public-trust-copy";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingAudience } from "@/components/landing/LandingAudience";
import { LandingWorkflowSection } from "@/components/landing/LandingWorkflowSection";
import { LandingCourseContentSection } from "@/components/landing/LandingCourseContentSection";
import { LandingTimelineSection } from "@/components/landing/LandingTimelineSection";

const landingCopy = {
  ar: {
    badge: "EARLY ACCESS",
    badgeMeta: "أول 90 مقعد بس",
    title: ["الـ", "AI", "بيبني مشاريع", "انت لسه", "بتتفرج؟"],
    subtitle:
      "تعلم الـ workflow اللي بيحوّل الأفكار لتطبيقات حقيقية: PRD، Spec Kit، UI direction، تنفيذ، مراجعة، اختبارات، أمان، SEO، Docker، وإطلاق production.",
    primaryCta: "احجز مكانك",
    secondaryCta: "شوف التسعير",
    trust: ["🔒 دفع آمن", "ردود خلال ساعة", "وصول فوري"],
    stats: [
      { value: "7", label: "مراحل واضحة" },
      { value: "عملي", label: "مش نظرية" },
      { value: "Production", label: "من أول يوم" }
    ],
    whoBadge: "لمين ده؟",
    whoTitle: "لو واحد من دول",
    whoAccent: "فأنت في المكان الصح",
    who: [
      {
        title: "مش تقني بس عندك فكرة",
        body: "هتتعلم تحول الفكرة لخطوات تنفيذ منظمة من غير ما تستنى فريق كامل."
      },
      {
        title: "Developer عايز يسرّع شغله",
        body: "هتشتغل أسرع بوضوح أكتر، من غير لف ودوران، وبـ review عملي."
      },
      {
        title: "عندك أساس وعايز نظام",
        body: "لو عندك أساس وعايز workflow واضح من أول الفكرة لحد الإطلاق—ده بالضبط اللي هنا."
      }
    ],
    problemBadge: "ليه النتائج بتطلع عشوائية؟",
    problemTitle: "مش المشكلة فيك،",
    problemAccent: "المشكلة في الـ workflow",
    problems: [
      {
        title: "بتشرح المشروع كل مرة من الأول",
        body: "بنشتغل بنظام artifacts يخلي الاتجاه ثابت بدل ما تبدأ من الصفر كل مرة."
      },
      {
        title: "بتعمل UI وبعدين تتوه في التنفيذ",
        body: "هتتعلم plan + tasks واضحة قبل ما تكتب الكود."
      },
      {
        title: "كود كتير بس مش production-ready",
        body: "فيه review loop: اختبارات + lint + security checks عشان تسلّم بثقة."
      },
      {
        title: "مفيش مخرجات قابلة للتسليم",
        body: "كل مرحلة لها outputs واضحة تقدر تبني عليها المرحلة اللي بعدها."
      }
    ],
    phasesBadge: "إيه اللي هتتعلمه؟",
    phasesTitle: "7 مراحل",
    phasesAccent: "من الفكرة للإطلاق",
    phases: [
      { label: "Phase 1", title: "PRD + Research", body: "تحديد المشكلة والسوق وMVP." },
      { label: "Phase 2", title: "Spec + Plan", body: "مواصفات وخطة تنفيذ قابلة للتطبيق." },
      { label: "Phase 3", title: "Build MVP", body: "تنفيذ النسخة الأولى backend + frontend." },
      { label: "Phase 4", title: "Testing", body: "اختبارات Unit/Integration/E2E للمسارات الأساسية." },
      { label: "Phase 5", title: "Security", body: "تأمين: auth, RBAC, rate limits, hardening." },
      { label: "Phase 6", title: "SEO + Growth", body: "تحسين التحويل والتتبع والصفحات العامة." },
      { label: "Phase 7", title: "Docker + Production", body: "تشغيل ونشر وإطلاق بموثوقية." }
    ],
    faqBadge: "أسئلة سريعة",
    finalBadge: "Early access محدود",
    finalTitle: "ابدأ بنظام شغل واضح… قبل ما السعر يتغير",
    finalSubtitle: "لو محتاج تسأل قبل الحجز، كلّمنا على واتساب."
  },
  en: {
    badge: "EARLY ACCESS",
    badgeMeta: "Only 90 seats",
    title: ["The", "AI", "ships products", "while you still", "watch."],
    subtitle:
      "Learn a practical workflow to turn ideas into production-ready apps: PRD, Spec Kit, UI direction, implementation, review, testing, security, SEO, Docker, and deployment.",
    primaryCta: "Get started",
    secondaryCta: "See pricing",
    trust: ["Secure payment", "Replies within an hour", "Instant access"],
    stats: [
      { value: "7", label: "clear phases" },
      { value: "hands-on", label: "not theory" },
      { value: "production", label: "from day one" }
    ],
    whoBadge: "Who is this for?",
    whoTitle: "If you are one of these,",
    whoAccent: "you are in the right place",
    who: [
      { title: "Non-technical with an idea", body: "Turn your idea into an executable plan without waiting for a full team." },
      { title: "A developer who wants speed", body: "Ship faster with clearer steps and a real review/testing loop." },
      { title: "You know the basics and want a system", body: "A clear workflow from idea → execution → deployment." }
    ],
    problemBadge: "Why results feel random",
    problemTitle: "It's not you,",
    problemAccent: "it's the workflow",
    problems: [
      { title: "You re-explain the project every time", body: "Work with artifacts that keep direction stable." },
      { title: "You get UI then get stuck", body: "Plan + tasks first, code second." },
      { title: "Lots of code, not production-ready", body: "Tests + lint + security checks to ship confidently." },
      { title: "No deliverable outputs", body: "Every phase has concrete outputs you can build on." }
    ],
    phasesBadge: "What you will learn",
    phasesTitle: "7 phases",
    phasesAccent: "to ship",
    phases: [
      { label: "Phase 1", title: "PRD + Research", body: "Define problem, market, MVP." },
      { label: "Phase 2", title: "Spec + Plan", body: "Executable specs and plan." },
      { label: "Phase 3", title: "Build MVP", body: "Backend + frontend implementation." },
      { label: "Phase 4", title: "Testing", body: "Unit, integration, E2E for P0 flows." },
      { label: "Phase 5", title: "Security", body: "Auth, RBAC, rate limits, hardening." },
      { label: "Phase 6", title: "SEO + Growth", body: "Public pages, tracking, conversion." },
      { label: "Phase 7", title: "Docker + Production", body: "Deploy with confidence." }
    ],
    faqBadge: "Quick FAQ",
    finalBadge: "Limited early access",
    finalTitle: "Start with a clear system before the price changes",
    finalSubtitle: "If you want to ask before reserving, message us on WhatsApp."
  }
};

export const Landing = () => {
  const { locale } = useParams();
  const resolved = resolveLocale(locale);
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const isAr = resolved === "ar";
  const copy = landingCopy[resolved];
  const faq = getPublicTrustCopy(resolved).faq;

  useRevealOnScroll({ selector: "[data-landing-section]" });

  return (
    <main className="reference-page landing-page">
      <div className="landing-noise" aria-hidden="true" />
      <div className="reference-shell">
        <LandingHero prefix={prefix} isAr={isAr} />
        <LandingAudience isAr={isAr} />
        <LandingWorkflowSection />
        <LandingCourseContentSection />
        <LandingTimelineSection />

        <section className="mt-12">
          <header className="text-center">
            <span className="reference-badge">
              <span className="reference-dot" aria-hidden="true" />
              {copy.faqBadge}
            </span>
            <h2 className="mt-5 font-display text-3xl font-black tracking-tight">
              {faq.title} <span className="accent-word">{faq.accent}</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl leading-8" style={{ color: "var(--color-text-secondary)" }}>
              {faq.subtitle}
            </p>
          </header>

          <div className="mt-7 space-y-3">
            {faq.items.slice(0, 4).map((item, index) => (
              <Disclosure defaultOpen={index === 0} key={item.q}>
                {({ open }) => (
                  <article className="reference-card faq-item-reference">
                    <DisclosureButton className="faq-question-reference">
                      <span>{item.q}</span>
                      <span className="faq-toggle-reference">{open ? "x" : "+"}</span>
                    </DisclosureButton>
                    <DisclosurePanel className="faq-answer-reference">
                      <p className="m-0">{item.a}</p>
                      <div className="faq-pills-reference">
                        {item.pills.map((pill) => (
                          <span className="reference-chip" key={pill}>{pill}</span>
                        ))}
                      </div>
                    </DisclosurePanel>
                  </article>
                )}
              </Disclosure>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link className="reference-button-secondary inline-flex items-center gap-2" to={`${prefix}/faq`}>
              <Search className="h-4 w-4" />
              {isAr ? "كل الأسئلة" : "All questions"}
            </Link>
            <a className="reference-button-secondary inline-flex items-center gap-2" href={contactInfo.whatsappUrl} target="_blank" rel="noreferrer">
              <ShieldCheck className="h-4 w-4" />
              {isAr ? "اسأل على واتساب" : "Ask on WhatsApp"}
            </a>
          </div>
        </section>

        <section className="reference-card reference-card--amber mt-12 p-8 text-center md:p-10">
          <span className="reference-badge">
            <span className="reference-dot" aria-hidden="true" />
            {copy.finalBadge}
          </span>
          <h2 className="mt-5 font-display text-3xl font-black">{copy.finalTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl leading-8" style={{ color: "var(--color-text-secondary)" }}>
            {copy.finalSubtitle}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link className="reference-button" to={`${prefix}/pricing`}>
              {isAr ? "ابدأ بالتسعير" : "Start with pricing"}
              <ArrowLeft className="icon-dir h-4 w-4" />
            </Link>
            <a className="reference-button-secondary" href={contactInfo.whatsappUrl} target="_blank" rel="noreferrer">
              {isAr ? "واتساب" : "WhatsApp"}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
};

