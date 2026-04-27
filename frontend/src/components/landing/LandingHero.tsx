import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { contactInfo } from "@/lib/public-page-content";

type LandingStat = { value: string; label: string };

const techPillVariants = ["prd", "spec", "cursor", "docker"] as const;

export const LandingHero = ({ prefix }: { prefix: string }) => {
  const { t } = useTranslation();

  const badge = t("landing.hero.badge");
  const badgeMeta = t("landing.hero.badgeMeta");
  const title = t("landing.hero.title", { returnObjects: true }) as string[];
  const subtitle = t("landing.hero.subtitle");
  const ctaPrimary = t("landing.hero.ctaPrimary");
  const ctaSecondary = t("landing.hero.ctaSecondary");
  const tech = t("landing.hero.tech", { returnObjects: true }) as string[];
  const trust = t("landing.hero.trust", { returnObjects: true }) as string[];
  const stats = t("landing.hero.stats", { returnObjects: true }) as LandingStat[];

  return (
    <section className="landing-hero landing-section" data-landing-section>
      <div className="landing-hero-grid">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow landing-reveal landing-reveal--hero-eyebrow">
            <span className="landing-eyebrow-dot" aria-hidden="true" />
            <span className="landing-eyebrow-text">{badge}</span>
            <span className="landing-eyebrow-sep" aria-hidden="true">
              •
            </span>
            <span className="landing-eyebrow-meta">{badgeMeta}</span>
          </span>

          <h1 className="landing-hero-title landing-reveal landing-reveal--hero-title">
            {title[0]} <span className="landing-typed">{title[1]}</span> {title[2]}
            <span className="block">
              {title[3]} <span className="landing-typed">{title[4]}</span>
              <span className="landing-typed-cursor" aria-hidden="true">
                ▍
              </span>
            </span>
          </h1>

          <p className="landing-hero-subtitle landing-reveal landing-reveal--hero-subtitle">{subtitle}</p>

          <div className="landing-tech-pills landing-reveal landing-reveal--hero-tech" dir="ltr">
            {tech.map((pill, index) => (
              <span className={`landing-tech-pill ${techPillVariants[index] ?? "cursor"}`} key={pill}>
                {pill}
              </span>
            ))}
          </div>

          <div className="landing-hero-actions landing-reveal landing-reveal--hero-actions">
            <Link className="reference-button" to={`${prefix}/register`}>
              {ctaPrimary}
              <ArrowLeft className="icon-dir h-4 w-4" />
            </Link>
            <Link className="reference-button-secondary" to={`${prefix}/pricing`}>
              {ctaSecondary}
            </Link>
          </div>

          <div className="landing-trust-row landing-reveal landing-reveal--hero-trust">
            {trust.map((item, index) => (
              <span key={item} className="landing-trust-item">
                {item}
                {index < trust.length - 1 ? <span className="landing-trust-sep" aria-hidden="true" /> : null}
              </span>
            ))}
          </div>

          <div className="landing-stats-compact landing-reveal landing-reveal--hero-stats">
            <div className="landing-stats-topline" aria-hidden="true" />
            <div className="landing-stats-grid">
              {stats.map((stat) => (
                <div className="landing-stat" key={stat.label}>
                  <p className="landing-stat-value">{stat.value}</p>
                  <p className="landing-stat-label">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="landing-mockup-wrap landing-reveal landing-reveal--hero-mockup">
          <div className="landing-mockup">
            <div className="landing-window-bar">
              <div className="landing-window-dots" aria-hidden="true">
                <span className="landing-window-dot red" />
                <span className="landing-window-dot yellow" />
                <span className="landing-window-dot lime" />
              </div>
              <div className="landing-window-meta">
                <span className="landing-filename">tasks.tsx</span>
                <a className="landing-live-badge" href={contactInfo.whatsappUrl} rel="noreferrer" target="_blank">
                  <span className="landing-live-dot" aria-hidden="true" />
                  <span className="landing-live-text">{t("common.whatsapp")}</span>
                </a>
              </div>
            </div>

            <div className="landing-code-grid" dir="ltr">
              <div className="landing-line-numbers" aria-hidden="true">
                {Array.from({ length: 11 }).map((_, index) => (
                  <div className="landing-line-number" key={index}>
                    {index + 1}
                  </div>
                ))}
              </div>
              <div className="landing-code-body">
                <div className="landing-code-lines is-writing">
                  <span className="landing-code-line" style={{ ["--line-delay" as never]: "0ms", ["--line-chars" as never]: 33 }}>
                    <span className="token keyword">export</span> <span className="token keyword">type</span>{" "}
                    <span className="token type">Task</span> = {"{"}
                  </span>
                  <span className="landing-code-line" style={{ ["--line-delay" as never]: "140ms", ["--line-chars" as never]: 32 }}>
                    {"  "}id: <span className="token type">string</span>;
                  </span>
                  <span className="landing-code-line" style={{ ["--line-delay" as never]: "260ms", ["--line-chars" as never]: 42 }}>
                    {"  "}owner: <span className="token string">"frontend"</span> | <span className="token string">"backend"</span>;
                  </span>
                  <span className="landing-code-line" style={{ ["--line-delay" as never]: "420ms", ["--line-chars" as never]: 38 }}>
                    {"  "}status: <span className="token string">"todo"</span> | <span className="token string">"done"</span>;
                  </span>
                  <span className="landing-code-line" style={{ ["--line-delay" as never]: "560ms", ["--line-chars" as never]: 16 }}>
                    {"}"}
                  </span>
                  <span className="landing-code-line" style={{ ["--line-delay" as never]: "760ms", ["--line-chars" as never]: 48 }}>
                    <span className="token keyword">export</span> <span className="token keyword">const</span>{" "}
                    <span className="token function">ReviewCard</span> = () =&gt; {"{"}
                  </span>
                  <span className="landing-code-line" style={{ ["--line-delay" as never]: "920ms", ["--line-chars" as never]: 46 }}>
                    {"  "}
                    <span className="token keyword">return</span> (&lt;<span className="token tag">article</span>&gt;…&lt;/
                    <span className="token tag">article</span>&gt;);
                  </span>
                  <span className="landing-code-line" style={{ ["--line-delay" as never]: "1100ms", ["--line-chars" as never]: 18 }}>
                    {"}"}
                  </span>
                  <span className="landing-code-line" style={{ ["--line-delay" as never]: "1320ms", ["--line-chars" as never]: 22 }}>
                    <span className="token comment">// tests, security, ship</span>
                  </span>
                  <span className="landing-code-line" style={{ ["--line-delay" as never]: "1500ms", ["--line-chars" as never]: 1 }}>
                    <span className="token cursor">█</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

