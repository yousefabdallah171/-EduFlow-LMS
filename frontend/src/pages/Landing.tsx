import { Link, useParams } from "react-router-dom";
import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { useTranslation } from "react-i18next";

const FAQ_KEYS = ["workflow", "prerequisites", "guarantee", "lifetime"] as const;

const phases = [
  { number: "01", title: "Planning", body: "Turn your ideas into PRDs and technical specs. Set up CLAUDE.md and define your project scope clearly." },
  { number: "02", title: "Design", body: "Create UI direction and design all screens before touching code. Generate components from Figma or Stitch." },
  { number: "03", title: "Implementation", body: "Build phase by phase with focused tasks. Keep the AI aligned to specs and prevent scope creep." },
  { number: "04", title: "Code Review", body: "Use Claude to review your code and generate E2E tests with Playwright. Maintain quality and test coverage." },
  { number: "05", title: "Security & Performance", body: "Run security audits and performance optimization. Harden before launch with Lighthouse 90+." },
  { number: "06", title: "SEO & Marketing", body: "Set up SEO, Meta Pixel, GA4, and conversion tracking. Make your project discoverable and measurable." },
  { number: "07", title: "Docker & Production", body: "Deploy with Docker, CI/CD, and server setup. Take your project live and keep it running." }
];

const features = [
  { icon: "📋", title: "PRD to Production", body: "From idea to shipped product. A complete roadmap that works every time." },
  { icon: "🤖", title: "AI as Your Partner", body: "Systematic prompts and workflows that turn AI into a reliable teammate, not a guessing game." },
  { icon: "⚡", title: "7 Proven Phases", body: "Planning, Design, Implementation, Review, Security, SEO, and Production — in the right order." },
  { icon: "📊", title: "Real Outputs", body: "Each phase delivers tangible results: specs, screens, code, tests, audits, and a live project." },
  { icon: "🔄", title: "Repeatable System", body: "Apply this workflow to any project size. SaaS, landing page, e-commerce, or internal tool." },
  { icon: "🎓", title: "Practical + Theory", body: "Watch real execution, learn the why, adapt to your context. Not just copy-paste prompts." }
];

const courseStats = [
  { value: "7", label: "Phases" },
  { value: "100%", label: "Practical" },
  { value: "0$", label: "Setup costs" },
  { value: "∞", label: "Lifetime access" }
];

const testimonials = [
  { quote: "This workflow changed how I work with AI. No more constant explanations — the system just works.", author: "Developer 1" },
  { quote: "الـ workflow الفعلي ليس theory. كل مرة بشتغل فيه بتطلع النتايج نفسها.", author: "مطور مصري" },
  { quote: "Takes what could be months and compresses it to weeks. The system does the heavy lifting.", author: "Founder" }
];

export const Landing = () => {
  const { locale } = useParams();
  const { t } = useTranslation();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const faqItems = FAQ_KEYS.map((key) => ({ key, q: t(`faq.items.${key}.q`), a: t(`faq.items.${key}.a`) }));

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--color-page)" }}>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-6 pb-24 pt-16">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-25 dark:opacity-15"
          style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(235,32,39,0.35), transparent)" }}
        />

        <div className="relative mx-auto max-w-5xl">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold"
            style={{ backgroundColor: "var(--color-brand-muted)", borderColor: "rgba(235,32,39,0.2)", color: "var(--color-brand)" }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-600" />
            AI Workflow Course
          </div>

          <h1
            className="max-w-3xl text-balance text-[clamp(2.25rem,6vw,4.25rem)] font-bold leading-[1.06] tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            {t("landing.heroTitle")}
          </h1>

          <p className="mt-6 max-w-xl text-base leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            {t("landing.heroSubtitle")}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:bg-brand-700 hover:shadow-md"
              to={`${prefix}/register`}
            >
              {t("actions.startFree")}
              <span className="opacity-70 icon-dir">→</span>
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-xl border px-6 py-3.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
              style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
              to={`${prefix}/faq`}
            >
              Learn More
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-14 grid grid-cols-2 gap-x-8 gap-y-5 sm:flex sm:flex-wrap sm:gap-10">
            {courseStats.map((stat) => (
              <div key={stat.value}>
                <p className="text-3xl font-bold tracking-tight text-brand-600">{stat.value}</p>
                <p className="mt-1 text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7 Phases ── */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">The Complete Workflow</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              7 Phases from Idea to Production
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {phases.map((phase) => (
              <div
                key={phase.number}
                className="relative rounded-2xl border p-6 transition-all hover:shadow-card-hover"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <p className="text-4xl font-bold opacity-10" style={{ color: "var(--color-brand)" }}>{phase.number}</p>
                <h3 className="mt-2 text-base font-bold" style={{ color: "var(--color-text-primary)" }}>{phase.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{phase.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Why this course works</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              A System, Not Just Tips
            </h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="group rounded-2xl border p-5 transition-all hover:shadow-card-hover"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                <span className="text-2xl">{feat.icon}</span>
                <h3 className="mt-3 text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{feat.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{feat.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social proof ── */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div
            className="rounded-2xl border p-8"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <p className="mb-6 text-center text-xs font-bold uppercase tracking-widest text-brand-600">What students say</p>
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((item) => (
                <div key={item.author} className="rounded-xl p-4" style={{ backgroundColor: "var(--color-surface-2)" }}>
                  <p className="text-sm leading-relaxed italic" style={{ color: "var(--color-text-secondary)" }}>
                    "{item.quote}"
                  </p>
                  <p className="mt-3 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>{item.author}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div
            className="relative overflow-hidden rounded-2xl p-10 text-center"
            style={{ backgroundColor: "var(--color-invert)", color: "var(--color-text-invert)" }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse 60% 80% at 50% 120%, rgba(235,32,39,0.35), transparent)" }}
            />
            <p className="relative text-xs font-bold uppercase tracking-widest opacity-60">Early Access</p>
            <h2 className="relative mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Ready to master the workflow?</h2>
            <p className="relative mt-3 mx-auto max-w-md text-sm opacity-70">
              Limited spots available at Early Access pricing. 30-day money-back guarantee.
            </p>
            <div className="relative mt-8 flex flex-wrap justify-center gap-3">
              <Link
                className="rounded-xl bg-brand-600 px-7 py-3.5 text-sm font-bold text-white no-underline transition-all hover:bg-brand-500 shadow-sm"
                to={`${prefix}/checkout`}
              >
                Enroll Now
              </Link>
              <Link
                className="rounded-xl border border-white/20 px-7 py-3.5 text-sm font-medium text-white no-underline transition-all hover:bg-white/10"
                to={`${prefix}/register`}
              >
                {t("actions.createAccount")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t("landing.faq")}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              {t("faq.title")}
            </h2>
          </div>
          <div className="space-y-2">
            {faqItems.map((item) => (
              <Disclosure key={item.key}>
                {({ open }) => (
                  <div
                    className="overflow-hidden rounded-xl border transition-all"
                    style={{
                      backgroundColor: "var(--color-surface)",
                      borderColor: open ? "var(--color-border-strong)" : "var(--color-border)"
                    }}
                  >
                    <DisclosureButton
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium transition-colors"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      <span>{item.q}</span>
                      <span
                        className="flex-shrink-0 text-lg font-thin transition-transform duration-200"
                        style={{ transform: open ? "rotate(45deg)" : "none", color: "var(--color-text-muted)" }}
                      >
                        +
                      </span>
                    </DisclosureButton>
                    <DisclosurePanel className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                      {item.a}
                    </DisclosurePanel>
                  </div>
                )}
              </Disclosure>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
};
