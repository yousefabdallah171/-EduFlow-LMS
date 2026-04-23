import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  hero?: boolean;
};

export const PageHeader = ({ eyebrow, title, description, actions, className, hero = false }: PageHeaderProps) => (
  <header className={cn(hero ? "dashboard-panel dashboard-panel--strong page-header page-header--hero" : "page-header", className)}>
    {eyebrow ? <p className={hero ? "page-header__eyebrow" : "section-heading__eyebrow"}>{eyebrow}</p> : null}
    <div className={cn("grid gap-3", actions ? "lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end" : undefined)}>
      <div className={hero ? "grid gap-2" : "section-heading"}>
        <h1 className={hero ? "page-header__title" : "section-heading__title"}>{title}</h1>
        {description ? (
          <p className={hero ? "page-header__description" : "section-heading__description"}>{description}</p>
        ) : null}
      </div>
      {actions ? <div className="relative z-[1] flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  </header>
);
