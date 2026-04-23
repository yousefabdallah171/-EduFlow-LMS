import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

type WorkflowItem = {
  before: string;
  after: string;
  pills: string[];
};

export const LandingWorkflowSection = () => {
  const { t } = useTranslation();

  const eyebrow = t("landing.workflow.eyebrow");
  const title = t("landing.workflow.title", { returnObjects: true }) as string[];
  const subtitle = t("landing.workflow.subtitle");
  const items = t("landing.workflow.items", { returnObjects: true }) as WorkflowItem[];

  return (
    <section className="landing-section landing-workflow" data-landing-section>
      <header className="landing-workflow-header">
        <span className="landing-eyebrow landing-eyebrow--danger">
          <span className="landing-eyebrow-dot landing-eyebrow-dot--danger" aria-hidden="true" />
          <span className="landing-eyebrow-text">{eyebrow}</span>
        </span>

        <h2 className="landing-section-title">
          {title[0]}
          <span className="block">
            {title[1]} <span className="landing-typed">{title[2]}</span>
          </span>
        </h2>
        <p className="landing-section-subtitle">{subtitle}</p>
      </header>

      <div className="landing-workflow-grid">
        {items.map((item, index) => (
          <article className="landing-workflow-card" key={index}>
            <div className="landing-workflow-row">
              <div className="landing-workflow-side landing-workflow-side--before">
                <p className="landing-workflow-index">{String(index + 1).padStart(2, "0")}</p>
                <p className="landing-workflow-label">❌ {t("landing.workflow.before")}</p>
                <p className="landing-workflow-text">{item.before}</p>
              </div>

              <div className="landing-workflow-arrow" aria-hidden="true">
                <ArrowLeft className="icon-dir h-4 w-4" />
              </div>

              <div className="landing-workflow-side landing-workflow-side--after">
                <p className="landing-workflow-label landing-workflow-label--after">✓ {t("landing.workflow.after")}</p>
                <p className="landing-workflow-text">{item.after}</p>
                <div className="landing-tool-pills" dir="ltr">
                  {item.pills.map((pill) => (
                    <span className="landing-tool-pill" key={pill}>
                      {pill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

