import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

type CredibilityItem = {
  title: string;
  subtitle?: string;
  highlight?: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const animateCounter = (element: HTMLElement, start: number, end: number, durationMs: number) => {
  const startTime = performance.now();

  const step = (now: number) => {
    const progress = clamp((now - startTime) / durationMs, 0, 1);
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const value = Math.round(start + (end - start) * eased);
    element.textContent = value.toString();
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
};

export const LandingNumbersSection = () => {
  const { t } = useTranslation();
  const rootRef = useRef<HTMLElement | null>(null);

  const titleLines = t("landing.numbers.titleLines", { returnObjects: true }) as string[];
  const credibility = t("landing.numbers.credibility.items", { returnObjects: true }) as CredibilityItem[];
  const developerAvatars = t("landing.numbers.cards.developers.avatars", { returnObjects: true }) as string[];
  const projectPills = t("landing.numbers.cards.projects.pills", { returnObjects: true }) as string[];

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-stat-card]"));
    if (!cards.length) return;

    const run = (card: HTMLElement) => {
      if (card.dataset.animated === "true") return;
      card.dataset.animated = "true";
      card.classList.add("is-animated");

      const counter = card.querySelector<HTMLElement>("[data-counter]");
      const target = Number(card.dataset.counterTarget || 0);
      if (counter && target) animateCounter(counter, 0, target, 1500);
    };

    if (prefersReducedMotion) {
      cards.forEach((card) => run(card));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          run(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.25 }
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [prefersReducedMotion]);

  return (
    <section className="landing-section landing-numbers" id="numbers" data-landing-section ref={rootRef}>
      <div className="section-header">
        <div className="landing-eyebrow landing-reveal">
          <span className="landing-eyebrow-dot" aria-hidden="true" />
          <span className="landing-eyebrow-text">{t("landing.numbers.eyebrow")}</span>
        </div>
        <h2 className="landing-section-title landing-reveal">
          {titleLines[0]}
          <br />
          {titleLines[1]} <span className="accent-word">{titleLines[2]}</span>
        </h2>
        <p className="landing-section-subtitle landing-reveal">{t("landing.numbers.subtitle")}</p>
      </div>

      <div className="landing-stats-grid-2x2">
        <article
          className="landing-stat-card landing-reveal"
          data-stat-card
          data-counter-target="30"
          style={{ ["--card-rgb" as never]: "163 230 53", ["--stat-index" as never]: 0 }}
        >
          <div className="landing-stat-accent-top landing-stat-accent-top--lime" aria-hidden="true" />
          <div className="landing-stat-kicker">{t("landing.numbers.cards.developers.kicker")}</div>
          <div className="landing-stat-number landing-stat-number--lime">
            +<span data-counter>0</span>
          </div>
          <p className="landing-stat-desc">{t("landing.numbers.cards.developers.desc")}</p>
          <div className="landing-stat-strip">
            <div className="landing-avatars" aria-hidden="true">
              {developerAvatars.slice(0, 3).map((avatar) => (
                <span className="landing-avatar" key={avatar}>
                  {avatar}
                </span>
              ))}
            </div>
            <span className="landing-stat-micro">{t("landing.numbers.cards.developers.micro")}</span>
          </div>
        </article>

        <article
          className="landing-stat-card landing-reveal"
          data-stat-card
          data-counter-target="50"
          style={{ ["--card-rgb" as never]: "56 189 248", ["--stat-index" as never]: 1 }}
        >
          <div className="landing-stat-accent-top landing-stat-accent-top--blue" aria-hidden="true" />
          <div className="landing-stat-kicker">{t("landing.numbers.cards.projects.kicker")}</div>
          <div className="landing-stat-number landing-stat-number--blue">
            +<span data-counter>0</span>
          </div>
          <p className="landing-stat-desc">{t("landing.numbers.cards.projects.desc")}</p>
          <div className="landing-stat-strip landing-stat-strip--block">
            <div className="landing-project-pills" dir="auto">
              {projectPills.slice(0, 3).map((pill, index) => (
                <span
                  className={[
                    "landing-project-pill",
                    index === 0 ? "landing-project-pill--purple" : index === 1 ? "landing-project-pill--blue" : "landing-project-pill--teal"
                  ].join(" ")}
                  key={pill}
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </article>

        <article
          className="landing-stat-card landing-reveal"
          data-stat-card
          data-counter-target="70"
          style={{ ["--card-rgb" as never]: "163 230 53", ["--stat-index" as never]: 2 }}
        >
          <div className="landing-stat-accent-top landing-stat-accent-top--transform" aria-hidden="true" />
          <div className="landing-stat-kicker">{t("landing.numbers.cards.bugs.kicker")}</div>
          <div className="landing-stat-number landing-stat-number--lime">
            <span data-counter>0</span>%
          </div>
          <p className="landing-stat-desc">{t("landing.numbers.cards.bugs.desc")}</p>
          <div className="landing-stat-strip landing-stat-strip--block">
            <div className="landing-bug-bar" aria-hidden="true">
              <div className="landing-bug-after" />
              <div className="landing-bug-before" />
            </div>
            <div className="landing-bug-labels">
              <span className="after">{t("landing.numbers.cards.bugs.after")}</span>
              <span className="before">{t("landing.numbers.cards.bugs.before")}</span>
            </div>
          </div>
        </article>

        <article
          className="landing-stat-card landing-reveal"
          data-stat-card
          style={{ ["--card-rgb" as never]: "251 191 36", ["--stat-index" as never]: 3 }}
        >
          <div className="landing-stat-accent-top landing-stat-accent-top--amber" aria-hidden="true" />
          <div className="landing-stat-kicker">{t("landing.numbers.cards.delivery.kicker")}</div>
          <div className="landing-delivery-row" aria-hidden="true">
            <span className="landing-delivery-old">{t("landing.numbers.cards.delivery.old")}</span>
            <span className="landing-delivery-arrow">←</span>
            <span className="landing-delivery-new">{t("landing.numbers.cards.delivery.new")}</span>
          </div>
          <p className="landing-stat-desc">{t("landing.numbers.cards.delivery.desc")}</p>
          <div className="landing-stat-strip landing-stat-strip--block">
            <div className="landing-delivery-labels">
              <span className="before">{t("landing.numbers.cards.delivery.labels.before")}</span>
              <span className="now">{t("landing.numbers.cards.delivery.labels.now")}</span>
            </div>
            <div className="landing-delivery-track" aria-hidden="true">
              <div className="landing-delivery-fill" />
            </div>
          </div>
        </article>
      </div>

      <div className="landing-credibility landing-reveal">
        <div className="landing-credibility-item">
          <span className="landing-credibility-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 3l7 4v5c0 4.5-2.5 7.5-7 9-4.5-1.5-7-4.5-7-9V7l7-4z" />
              <path d="M9.5 12l2 2 3-4" />
            </svg>
          </span>
          <div>
            <div className="landing-credibility-title">{credibility[0]?.title}</div>
            <div className="landing-credibility-subtitle">{credibility[0]?.subtitle}</div>
          </div>
        </div>

        <div className="landing-credibility-divider" aria-hidden="true" />

        <div className="landing-credibility-item">
          <span className="landing-credibility-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v5l3 2" />
            </svg>
          </span>
          <div>
            <div className="landing-credibility-title">{credibility[1]?.title}</div>
            <div className={["landing-credibility-subtitle", credibility[1]?.highlight ? "highlight" : ""].join(" ")}>
              {credibility[1]?.subtitle}
            </div>
          </div>
        </div>

        <div className="landing-credibility-divider" aria-hidden="true" />

        <div className="landing-credibility-item">
          <span className="landing-credibility-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M20 12a8 8 0 1 1-2.34-5.66" />
              <path d="M20 4v6h-6" />
            </svg>
          </span>
          <div>
            <div className="landing-credibility-title">{credibility[2]?.title}</div>
            <div className="landing-credibility-subtitle">{credibility[2]?.subtitle}</div>
          </div>
        </div>
      </div>

      <div className="landing-section-footer landing-reveal" aria-hidden="true">
        <div className="landing-footer-line" />
        <span className="landing-footer-arrow">↓</span>
      </div>
    </section>
  );
};

