import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  hero?: boolean;
  backHref?: string;
  backLabel?: string;
};

export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
  className,
  hero = false,
  backHref,
  backLabel
}: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header className={cn(hero ? "dashboard-panel dashboard-panel--strong page-header page-header--hero" : "page-header", className)}>
      {backHref && backLabel ? (
        <div className="relative z-[1]">
          <button
            type="button"
            className="page-header__back"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                navigate(-1);
                return;
              }

              navigate(backHref);
            }}
          >
            <ArrowLeft className="icon-dir h-4 w-4" />
            <span>{backLabel}</span>
          </button>
        </div>
      ) : null}
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
};
