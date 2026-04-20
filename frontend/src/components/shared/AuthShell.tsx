import type { ReactNode } from "react";

type AuthHighlight = {
  title: string;
  description: string;
};

type AuthShellProps = {
  badge: string;
  title: string;
  subtitle: string;
  highlights: AuthHighlight[];
  children: ReactNode;
  footer?: ReactNode;
  aside?: ReactNode;
};

export const AuthShell = ({ badge, title, subtitle, highlights, children, footer, aside }: AuthShellProps) => (
  <div className="relative min-h-dvh overflow-hidden px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{
        background: [
          "radial-gradient(circle at top left, color-mix(in oklab, var(--color-brand) 18%, transparent) 0%, transparent 34%)",
          "radial-gradient(circle at bottom right, color-mix(in oklab, var(--color-accent) 12%, transparent) 0%, transparent 30%)",
          "linear-gradient(180deg, color-mix(in oklab, var(--color-page) 84%, black 16%) 0%, var(--color-page) 68%)",
        ].join(", ")
      }}
    />

    <div className="app-shell relative flex min-h-[calc(100dvh-4rem)] items-center">
      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(24rem,31rem)] xl:gap-8">
        <section className="surface-card relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in oklab, var(--color-brand) 45%, white 55%), transparent)"
            }}
          />

          <div className="content-stack gap-6">
            <div className="content-stack gap-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.35rem] text-lg font-black text-white shadow-elevated" style={{ background: "var(--gradient-brand)" }}>
                E
              </div>
              <div className="content-stack gap-3">
                <p className="section-heading__eyebrow">{badge}</p>
                <div className="content-stack gap-3">
                  <h1 className="max-w-2xl text-balance font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl" style={{ color: "var(--color-text-primary)" }}>
                    {title}
                  </h1>
                  <p className="max-w-2xl text-pretty text-sm leading-7 sm:text-base" style={{ color: "var(--color-text-secondary)" }}>
                    {subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {highlights.map((highlight) => (
                <article
                  key={highlight.title}
                  className="rounded-[1.3rem] border px-4 py-4"
                  style={{
                    backgroundColor: "color-mix(in oklab, var(--color-surface-2) 78%, transparent)",
                    borderColor: "color-mix(in oklab, var(--color-border-strong) 85%, transparent)"
                  }}
                >
                  <h2 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {highlight.title}
                  </h2>
                  <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                    {highlight.description}
                  </p>
                </article>
              ))}
            </div>

            {aside ? (
              <div
                className="rounded-[1.5rem] border px-5 py-4"
                style={{
                  backgroundColor: "color-mix(in oklab, var(--color-brand) 8%, var(--color-surface))",
                  borderColor: "color-mix(in oklab, var(--color-brand) 24%, var(--color-border))"
                }}
              >
                {aside}
              </div>
            ) : null}
          </div>
        </section>

        <section className="surface-card p-6 sm:p-8">
          <div className="content-stack gap-6">
            {children}
            {footer ? (
              <div className="border-t pt-5" style={{ borderColor: "var(--color-border)" }}>
                {footer}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  </div>
);
