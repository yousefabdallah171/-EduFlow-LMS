import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: string;
  action?: ReactNode;
  illustration?: ReactNode;
  eyebrow?: string;
};

export const EmptyState = ({ title, description, icon, action, illustration, eyebrow }: EmptyStateProps) => (
  <div
    className="dashboard-panel rounded-[28px] border-dashed p-8 text-center sm:p-10"
    style={{ borderColor: "var(--color-border-strong)" }}
  >
    <div className="mx-auto grid max-w-md gap-4">
      <div>
        {illustration ?? (
          <div
            aria-hidden="true"
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] text-brand-600"
            style={{ backgroundColor: "color-mix(in oklab, var(--color-brand) 12%, transparent)" }}
          >
            <span className="text-sm font-bold">{icon ?? "i"}</span>
          </div>
        )}
      </div>
      <div className="grid gap-2">
        {eyebrow ? (
          <p className="section-heading__eyebrow text-center">{eyebrow}</p>
        ) : null}
        <h2 className="text-balance text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>{title}</h2>
        <p className="text-pretty text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>{description}</p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  </div>
);
