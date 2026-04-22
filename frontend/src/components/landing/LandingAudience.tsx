import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

type AudienceCard = { title: string; body: string };

export const LandingAudience = ({ isAr }: { isAr: boolean }) => {
  const { t } = useTranslation();

  const eyebrow = t("landing.audience.eyebrow");
  const title = t("landing.audience.title");
  const accent = t("landing.audience.accent");
  const subtitle = t("landing.audience.subtitle");
  const cards = t("landing.audience.cards", { returnObjects: true }) as AudienceCard[];
  const fitLabel = isAr ? "مناسب" : "Good fit";

  return (
    <section className="landing-section" data-landing-section>
      <div className="section-header section-header--left">
        <div className="landing-eyebrow">
          <span className="landing-eyebrow-dot" aria-hidden="true" />
          <span className="landing-eyebrow-text">{eyebrow}</span>
        </div>
        <h2 className="landing-section-title">
          {title} <span className="landing-typed">{accent}</span>
        </h2>
        <p className="landing-section-subtitle">{subtitle}</p>
      </div>

      <div className="landing-audience-grid">
        {cards.map((item, index) => (
          <article className="landing-audience-card" key={item.title}>
            <div className="landing-audience-kicker">{String(index + 1).padStart(2, "0")}</div>
            <h3 className="landing-audience-title">{item.title}</h3>
            <p className="landing-audience-copy">{item.body}</p>
            <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-brand-600">
              <CheckCircle2 className="h-4 w-4" />
              {fitLabel}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

