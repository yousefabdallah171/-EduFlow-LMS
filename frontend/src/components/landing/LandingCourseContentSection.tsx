import { useTranslation } from "react-i18next";

type CurriculumCard = {
  accent: "lime" | "orange" | "blue" | "purple" | "red" | "teal" | "amber";
  number: string;
  badge: string;
  title: string;
  body: string;
  tags: string[];
  output: string;
  wide?: boolean;
};

export const LandingCourseContentSection = () => {
  const { t } = useTranslation();

  const eyebrow = t("landing.curriculum.eyebrow");
  const titleLines = t("landing.curriculum.titleLines", { returnObjects: true }) as string[];
  const subtitle = t("landing.curriculum.subtitle");

  const kicker = t("landing.curriculum.kicker");
  const introText = t("landing.curriculum.introText");
  const metaPills = t("landing.curriculum.metaPills", { returnObjects: true }) as string[];

  const cards = t("landing.curriculum.cards", { returnObjects: true }) as CurriculumCard[];
  const footerMicro = t("landing.curriculum.footerMicro");

  return (
    <section className="landing-section landing-curriculum" id="course-content" data-landing-section>
      <div className="section-header section-header--left">
        <div className="landing-eyebrow landing-reveal">
          <span className="landing-eyebrow-dot" aria-hidden="true" />
          <span className="landing-eyebrow-text">{eyebrow}</span>
        </div>
        <h2 className="landing-section-title landing-reveal">
          {titleLines[0]}
          <br />
          {titleLines[1]} <span className="landing-typed">{titleLines[2]}</span>
        </h2>
        <p className="landing-section-subtitle landing-reveal">{subtitle}</p>
      </div>

      <div className="landing-curriculum-intro landing-reveal">
        <div className="landing-curriculum-intro__copy">
          <span className="landing-curriculum-kicker" dir="ltr">
            {kicker}
          </span>
          <p className="landing-curriculum-intro__text">{introText}</p>
        </div>
        <div className="landing-curriculum-intro__meta" dir="ltr">
          {metaPills.map((pill) => (
            <span className="landing-curriculum-meta-pill" key={pill}>
              {pill}
            </span>
          ))}
        </div>
      </div>

      <div className="landing-curriculum-grid">
        {cards.map((card, index) => (
          <article
            className={[
              "landing-curriculum-card",
              "landing-reveal",
              `landing-curriculum-card--${card.accent}`,
              card.wide ? "landing-curriculum-card--wide" : ""
            ].join(" ")}
            key={card.number}
            style={{ ["--curriculum-index" as never]: index }}
          >
            <div className="landing-curriculum-card__top">
              <span className="landing-curriculum-number" dir="ltr">
                {card.number}
              </span>
              <span className="landing-curriculum-badge">{card.badge}</span>
            </div>
            <h3 className="landing-curriculum-title">{card.title}</h3>
            <p className="landing-curriculum-copy">{card.body}</p>
            <div className="landing-curriculum-tags" dir="ltr">
              {card.tags.map((tag) => (
                <span className="landing-curriculum-tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <div className="landing-curriculum-output">
              <span className="landing-curriculum-output__label" dir="ltr">
                OUTPUT
              </span>
              <span className="landing-curriculum-output__value">{card.output}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="landing-section-footer landing-reveal" aria-hidden="true">
        <div className="landing-footer-line" />
        <p className="landing-footer-micro">{footerMicro}</p>
        <span className="landing-footer-arrow">↓</span>
      </div>
    </section>
  );
};
