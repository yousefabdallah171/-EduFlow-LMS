import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { lazy, Suspense, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";

import { contactInfo } from "@/lib/public-page-content";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { api } from "@/lib/api";
import { CACHE_TIME, getGCTime } from "@/lib/query-config";
import { LandingHero } from "@/components/landing/LandingHero";
import { SEO } from "@/components/shared/SEO";
import { SEO_PAGES } from "@/lib/seo-config";
import { LandingLoadingSkeleton } from "@/components/landing/LandingLoadingSkeleton";

// Lazy load below-fold sections for faster initial render
const LandingAudience = lazy(() => import("@/components/landing/LandingAudience").then(m => ({ default: m.LandingAudience })));
const LandingWorkflowSection = lazy(() => import("@/components/landing/LandingWorkflowSection").then(m => ({ default: m.LandingWorkflowSection })));
const LandingCourseContentSection = lazy(() => import("@/components/landing/LandingCourseContentSection").then(m => ({ default: m.LandingCourseContentSection })));
const LandingTimelineSection = lazy(() => import("@/components/landing/LandingTimelineSection").then(m => ({ default: m.LandingTimelineSection })));
const LandingNumbersSection = lazy(() => import("@/components/landing/LandingNumbersSection").then(m => ({ default: m.LandingNumbersSection })));
const LandingPricingSection = lazy(() => import("@/components/landing/LandingPricingSection").then(m => ({ default: m.LandingPricingSection })));
const LandingFaqSection = lazy(() => import("@/components/landing/LandingFaqSection").then(m => ({ default: m.LandingFaqSection })));

const courseSchema = {
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "Build a Full Production App with AI",
  "description": "Practical hands-on course: from idea to PRD, design, implementation, security, testing, and deployment.",
  "provider": {
    "@type": "Person",
    "name": "Yousef Abdallah",
    "url": "https://yousef-abdallah.online/about",
  },
  "offers": {
    "@type": "Offer",
    "priceCurrency": "EGP",
    "availability": "https://schema.org/InStock",
    "url": "https://yousef-abdallah.online/pricing",
  },
  "inLanguage": ["en", "ar"],
  "educationalLevel": "Intermediate",
  "url": "https://yousef-abdallah.online/",
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Yousef Abdallah",
  "url": "https://yousef-abdallah.online",
  "knowsAbout": ["Full-Stack Development", "AI-powered development", "React", "Node.js", "TypeScript"],
};

export const Landing = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  useRevealOnScroll({ selector: "[data-landing-section]" });

  // Prefetch pricing data to avoid delay when PricingSection renders
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: ["course"],
      queryFn: async () => {
        const response = await api.get("/course");
        return response.data;
      },
      staleTime: CACHE_TIME.MEDIUM,
      gcTime: getGCTime(CACHE_TIME.MEDIUM)
    });
  }, [queryClient]);

  return (
    <main className="reference-page landing-page">
      <SEO page={SEO_PAGES.landing} structuredData={[courseSchema, orgSchema]} />
      <div className="landing-noise" aria-hidden="true" />
      <div className="reference-shell">
        <LandingHero prefix={prefix} />
        <div className="landing-hero-divider" />
        <Suspense fallback={<LandingLoadingSkeleton />}>
          <div role="region" aria-label={t("landing.audience.title", "Who is this for?")}>
            <LandingAudience />
          </div>
          <div role="region" aria-label={t("landing.workflow.title", "Workflow")}>
            <LandingWorkflowSection />
          </div>
          <div role="region" aria-label={t("landing.courseContent.title", "Course Content")}>
            <LandingCourseContentSection />
          </div>
          <div role="region" aria-label={t("landing.timeline.title", "Timeline")}>
            <LandingTimelineSection />
          </div>
          <div role="region" aria-label={t("landing.numbers.title", "Impact")}>
            <LandingNumbersSection />
          </div>
          <div role="region" aria-label={t("landing.pricing.title", "Pricing")}>
            <LandingPricingSection prefix={prefix} />
          </div>
          <div role="region" aria-label={t("landing.faq.title", "FAQ")}>
            <LandingFaqSection prefix={prefix} />
          </div>
        </Suspense>

        <section className="reference-card reference-card--amber mt-12 p-8 text-center md:p-10">
          <span className="reference-badge">
            <span className="reference-dot" aria-hidden="true" />
            {t("landing.final.badge")}
          </span>
          <h2 className="mt-5 font-display text-3xl font-black">{t("landing.final.title")}</h2>
          <p className="mx-auto mt-3 max-w-2xl leading-8" style={{ color: "var(--color-text-secondary)" }}>
            {t("landing.final.subtitle")}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link className="reference-button" to={`${prefix}/pricing`}>
              {t("landing.final.pricingCta")}
              <ArrowLeft className="icon-dir h-4 w-4" />
            </Link>
            <a
              className="reference-button-secondary"
              href={contactInfo.whatsappUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t("common.whatsapp") + " (opens in new window)"}
            >
              {t("common.whatsapp")}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
};

