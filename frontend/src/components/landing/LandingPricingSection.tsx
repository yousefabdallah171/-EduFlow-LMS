import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { resolveLocale } from "@/lib/locale";

type PricingCard = {
  id: string;
  variant: "starter" | "featured" | "vip";
  featuredBadge?: string;
  kicker: string;
  title: string;
  description?: string;
  soldOutBadge?: string;
  soldOutBody?: string;
  oldPrice: string;
  price: string;
  currency: string;
  savePill: string;
  priceNote?: string;
  features: string[];
  cta?: string;
  ctaDisabled?: string;
};

type CoursePackage = { id: string; priceEgp: number; currency: string };

export const LandingPricingSection = ({
  prefix,
  showHeader = true,
  forceVisible = false
}: {
  prefix: string;
  showHeader?: boolean;
  forceVisible?: boolean;
}) => {
  const { t, i18n } = useTranslation();
  const isAr = resolveLocale(i18n.language) === "ar";

  const titleLines = t("landing.pricing.titleLines", { returnObjects: true }) as string[];
  const cards = t("landing.pricing.cards", { returnObjects: true }) as PricingCard[];
  const trust = t("landing.pricing.trust", { returnObjects: true }) as string[];

  const courseQuery = useQuery({
    queryKey: ["course-public"],
    queryFn: async () => {
      const response = await api.get<{ packages?: CoursePackage[] }>("/course");
      return response.data;
    },
    staleTime: 60_000
  });

  const packages = courseQuery.data?.packages ?? [];
  const byId = new Map(packages.map((pkg) => [pkg.id, pkg] as const));

  const starter = cards.find((card) => card.variant === "starter");
  const featured = cards.find((card) => card.variant === "featured");
  const vip = cards.find((card) => card.variant === "vip");

  const ordered = [starter, featured, vip].filter(Boolean) as PricingCard[];

  return (
    <section
      className={["landing-section", "landing-pricing", forceVisible ? "is-visible" : ""].join(" ")}
      id="pricing"
      data-landing-section
    >
      {showHeader ? (
        <div className="section-header">
          <div className="landing-eyebrow landing-reveal">
            <span className="landing-eyebrow-dot" aria-hidden="true" />
            <span className="landing-eyebrow-text">{t("landing.pricing.eyebrow")}</span>
          </div>
          <h2 className="landing-section-title landing-reveal">
            {titleLines[0]}
            <br />
            <span className="accent-word">{titleLines[1]}</span> {titleLines[2]}
          </h2>
          <p className="landing-section-subtitle landing-reveal">{t("landing.pricing.subtitle")}</p>
        </div>
      ) : null}

      <div className="landing-guarantee landing-reveal">
        <div className="landing-guarantee-badge">{t("landing.pricing.guarantee.badge")}</div>
        <h3 className="landing-guarantee-title">
          {t("landing.pricing.guarantee.title")}
        </h3>
        <p className="landing-guarantee-copy">{t("landing.pricing.guarantee.body")}</p>
      </div>

      <div className="landing-pricing-grid">
        {ordered.map((card, index) => {
          const featuredCard = card.variant === "featured";
          const soldOut = card.variant === "vip";
          const pkg = byId.get(card.id);
          const resolvedCurrency = pkg?.currency ?? card.currency;
          const currencyLabel = resolvedCurrency === "EGP" ? t("common.currency.egp") : resolvedCurrency;
          const resolvedPrice = pkg?.priceEgp != null ? pkg.priceEgp.toLocaleString(isAr ? "ar-EG" : "en-US") : card.price;

          return (
            <article
              className={[
                "landing-pricing-card",
                "landing-reveal",
                `landing-pricing-card--${card.variant}`,
                soldOut ? "is-sold-out" : ""
              ].join(" ")}
              key={card.id}
              style={{ ["--pricing-index" as never]: index }}
            >
              {featuredCard && card.featuredBadge ? (
                <div className="landing-pricing-featured-badge" dir="auto">
                  {card.featuredBadge}
                </div>
              ) : null}

              <div className="landing-pricing-top-accent" aria-hidden="true" />

              <div className="landing-pricing-kicker" dir="ltr">
                {card.kicker}
              </div>

              <h3 className="landing-pricing-title">{card.title}</h3>

              {soldOut && card.soldOutBadge ? (
                <div className="landing-pricing-soldout-pill" dir="auto">
                  <span className="landing-pricing-soldout-dot" aria-hidden="true" />
                  <span>{card.soldOutBadge}</span>
                </div>
              ) : null}

              {soldOut && card.soldOutBody ? (
                <p className="landing-pricing-description">
                  {card.soldOutBody.split("\n").map((line, lineIndex) => (
                    <Fragment key={lineIndex}>
                      {line}
                      {lineIndex === 0 ? <br /> : null}
                    </Fragment>
                  ))}
                </p>
              ) : (
                <p className="landing-pricing-description">{card.description}</p>
              )}

              <div className="landing-pricing-price">
                <div className="landing-pricing-old">{card.oldPrice}</div>
                <div className="landing-pricing-row">
                  <span className="landing-pricing-value" dir="ltr">
                    {resolvedPrice}
                  </span>
                  <span className="landing-pricing-currency">{currencyLabel}</span>
                </div>
                <span className="landing-pricing-save">{card.savePill}</span>
                {card.priceNote ? <span className="landing-pricing-note">{card.priceNote}</span> : null}
              </div>

              <div className="landing-pricing-divider" aria-hidden="true" />

              <ul className="landing-pricing-features">
                {card.features.map((feature) => (
                  <li key={feature} className="landing-pricing-feature">
                    <svg className="landing-pricing-feature-icon" viewBox="0 0 16 16" aria-hidden="true">
                      <circle cx="8" cy="8" r="6" />
                      <path d="M5.2 8.2l1.7 1.7 3.9-4.1" />
                    </svg>
                    <span className="landing-pricing-feature-text">{feature}</span>
                  </li>
                ))}
              </ul>

              {soldOut ? (
                <button className="landing-pricing-cta landing-pricing-cta--disabled" disabled type="button">
                  {card.ctaDisabled}
                </button>
              ) : (
                <Link
                  className={[
                    "landing-pricing-cta",
                    featuredCard ? "landing-pricing-cta--primary" : "landing-pricing-cta--subtle"
                  ].join(" ")}
                  to={`${prefix}/checkout?package=${card.id}`}
                >
                  {card.cta}
                </Link>
              )}
            </article>
          );
        })}
      </div>

      <div className="landing-pricing-trust landing-reveal" dir="auto">
        {trust.map((item) => (
          <span className="landing-pricing-trust-item" key={item}>
            {item}
          </span>
        ))}
      </div>
    </section>
  );
};
