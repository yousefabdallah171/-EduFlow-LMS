import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: string;
  action?: ReactNode;
  illustration?: ReactNode;
};

export const EmptyState = ({ title, description, icon, action, illustration }: EmptyStateProps) => (
  <div
    className="rounded-2xl border border-dashed p-8 text-center"
    style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-surface-2)" }}
  >
    <div className="mx-auto max-w-md">
      <div className="mb-4">
        {illustration ?? (
          <div
            aria-hidden="true"
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-brand-600"
            style={{ backgroundColor: "var(--color-brand-muted)" }}
          >
            <span className="text-xl">{icon ?? "○"}</span>
          </div>
        )}
      </div>
      <h2 className="text-balance text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>{title}</h2>
      <p className="mt-2 text-pretty text-sm" style={{ color: "var(--color-text-secondary)" }}>{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  </div>
);
