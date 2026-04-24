import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { contactInfo } from "@/lib/public-page-content";
import { useRevealOnScroll } from "@/hooks/useRevealOnScroll";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingAudience } from "@/components/landing/LandingAudience";
import { LandingWorkflowSection } from "@/components/landing/LandingWorkflowSection";
import { LandingCourseContentSection } from "@/components/landing/LandingCourseContentSection";
import { LandingTimelineSection } from "@/components/landing/LandingTimelineSection";
import { LandingNumbersSection } from "@/components/landing/LandingNumbersSection";
import { LandingPricingSection } from "@/components/landing/LandingPricingSection";
import { LandingFaqSection } from "@/components/landing/LandingFaqSection";

export const Landing = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t } = useTranslation();

  useRevealOnScroll({ selector: "[data-landing-section]" });

  return (
    <main className="reference-page landing-page">
      <div className="landing-noise" aria-hidden="true" />
      <div className="reference-shell">
        <LandingHero prefix={prefix} />
        <LandingAudience />
        <LandingWorkflowSection />
        <LandingCourseContentSection />
        <LandingTimelineSection />
        <LandingNumbersSection />
        <LandingPricingSection prefix={prefix} />

        <LandingFaqSection prefix={prefix} />

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
            <a className="reference-button-secondary" href={contactInfo.whatsappUrl} target="_blank" rel="noreferrer">
              {t("common.whatsapp")}
            </a>
          </div>
        </section>
      </div>
    </main>
  );
};

