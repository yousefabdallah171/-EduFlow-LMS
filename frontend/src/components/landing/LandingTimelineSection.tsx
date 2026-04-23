import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

type TimelinePhase = {
  number: string;
  tool: string;
  title: string;
  body: string;
  output: string;
  rgb: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const LandingTimelineSection = () => {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement | null>(null);
  const lineFillRef = useRef<HTMLDivElement | null>(null);

  const phases = t("landing.timeline.phases", { returnObjects: true }) as TimelinePhase[];
  const titleLines = t("landing.timeline.titleLines", { returnObjects: true }) as string[];

  const completionEmoji = t("landing.timeline.completion.emoji");
  const completionText = t("landing.timeline.completion.text");

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const lineFill = lineFillRef.current;
    if (!section || !lineFill) return;

    const phaseElements = Array.from(section.querySelectorAll<HTMLElement>("[data-phase]"));
    const completion = section.querySelector<HTMLElement>("[data-timeline-completion]");

    if (prefersReducedMotion) {
      phaseElements.forEach((phase) => phase.classList.add("is-visible"));
      completion?.classList.add("is-visible");
      lineFill.style.height = "100%";
      return;
    }

    const phaseObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).classList.add("is-visible");
          phaseObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.3 }
    );

    phaseElements.forEach((phase) => phaseObserver.observe(phase));

    const completionObserver = completion
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              (entry.target as HTMLElement).classList.add("is-visible");
              completionObserver?.unobserve(entry.target);
            });
          },
          { threshold: 0.2 }
        )
      : null;

    if (completionObserver && completion) completionObserver.observe(completion);

    const isMobile = window.matchMedia("(max-width: 720px)");
    let cachedHeight = section.offsetHeight;
    let cachedViewport = window.innerHeight;
    let cachedOffsetTop = section.getBoundingClientRect().top + window.scrollY;

    const updateLineFill = () => {
      const scrolled = window.scrollY;
      const relativeTop = cachedOffsetTop - scrolled;
      const total = cachedHeight + cachedViewport * (isMobile.matches ? 0.12 : 0.25);
      const progressed = clamp(cachedViewport - relativeTop, 0, total);
      const pct = total ? clamp(progressed / total, 0, 1) * 100 : 0;
      lineFill.style.height = `${pct}%`;
    };

    let resizeTimer: number | undefined;
    const recalc = () => {
      cachedViewport = window.innerHeight;
      cachedHeight = section.offsetHeight;
      cachedOffsetTop = section.getBoundingClientRect().top + window.scrollY;
      updateLineFill();
    };

    let ticking = false;
    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        updateLineFill();
        ticking = false;
      });
    };

    const onResize = () => {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(recalc, 150);
    };

    updateLineFill();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      phaseObserver.disconnect();
      completionObserver?.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", onResize);
      if (resizeTimer) window.clearTimeout(resizeTimer);
    };
  }, [prefersReducedMotion]);

  return (
    <section className="landing-section landing-timeline-section" id="timeline" data-landing-section ref={sectionRef}>
      <div className="landing-narrow">
        <div className="section-header">
          <div className="landing-eyebrow landing-reveal">
            <span className="landing-eyebrow-dot" aria-hidden="true" />
            <span className="landing-eyebrow-text">{t("landing.timeline.eyebrow")}</span>
          </div>
          <h2 className="landing-section-title landing-reveal">
            {titleLines[0]}
            <br />
            {titleLines[1]}{" "}
            <span className="accent-word" dir="ltr">
              {titleLines[2]}
            </span>
          </h2>
          <p className="landing-section-subtitle landing-reveal">{t("landing.timeline.subtitle")}</p>
        </div>

        <div className="landing-timeline">
          <div className="landing-timeline-line" aria-hidden="true" />
          <div className="landing-timeline-line-fill" aria-hidden="true" ref={lineFillRef} />

          {phases.map((phase, index) => {
            const isOdd = index % 2 === 0;
            const phaseStyle = { ["--phase-rgb" as never]: phase.rgb };

            const card = (
              <article className="landing-phase-card">
                <div className="landing-phase-meta">
                  <span className="landing-phase-index" dir="ltr">
                    {phase.number}
                  </span>
                  <span className="landing-phase-tool-pill" dir="ltr">
                    {phase.tool}
                  </span>
                </div>
                <h3 className="landing-phase-title">{phase.title}</h3>
                <p className="landing-phase-description">{phase.body}</p>
                <div className="landing-phase-output">
                  <span className="landing-phase-output-label" dir="ltr">
                    OUTPUT
                  </span>
                  <span className="landing-phase-output-pill">{phase.output}</span>
                </div>
              </article>
            );

            return (
              <div
                className={["landing-phase", isOdd ? "landing-phase--odd" : "landing-phase--even"].join(" ")}
                data-phase
                key={phase.number}
                style={phaseStyle}
              >
                <div className="landing-phase-content landing-phase-content--left">
                  {!isOdd ? (
                    <>
                      <div className="landing-phase-connector" aria-hidden="true" />
                      {card}
                    </>
                  ) : null}
                </div>

                <div className="landing-phase-node-col" aria-hidden="true">
                  <div className="landing-phase-segment" />
                  <div className="landing-phase-segment-fill" />
                  <div className="landing-phase-node" dir="ltr">
                    {phase.number}
                  </div>
                </div>

                <div className="landing-phase-content landing-phase-content--right">
                  {isOdd ? (
                    <>
                      <div className="landing-phase-connector" aria-hidden="true" />
                      {card}
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}

          <div className="landing-timeline-completion" data-timeline-completion>
            <div className="landing-completion-circle" aria-hidden="true">
              {completionEmoji}
            </div>
            <div className="landing-completion-text">{completionText}</div>
            <div className="landing-completion-line" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
};

