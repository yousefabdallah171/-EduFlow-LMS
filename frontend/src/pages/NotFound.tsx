import { Link, useLocation } from "react-router-dom";

import { resolveLocale } from "@/lib/locale";
import { getPublicTrustCopy } from "@/lib/public-trust-copy";
import { SEO } from "@/components/shared/SEO";
import { SEO_PAGES } from "@/lib/seo-config";

export const NotFound = () => {
  const location = useLocation();
  const segment = location.pathname.split("/")[1];
  const prefix = segment === "en" || segment === "ar" ? `/${segment}` : "";
  const copy = getPublicTrustCopy(resolveLocale(segment)).notFound;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "var(--color-page)" }}>
      <SEO page={SEO_PAGES.notFound} />
      <div className="reference-card max-w-xl p-8">
        <p className="text-8xl font-black opacity-10" style={{ color: "var(--color-brand)" }}>404</p>
        <h1 className="mt-4 text-3xl font-black" style={{ color: "var(--color-text-primary)" }}>
          {copy.title}
        </h1>
        <p className="mt-3 text-lg" style={{ color: "var(--color-text-secondary)" }}>
          {copy.subtitle}
        </p>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-7" style={{ color: "var(--color-text-muted)" }}>
          {copy.body}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="reference-button" to={`${prefix}/`}>
            {copy.home}
          </Link>
          <Link className="reference-button-secondary" to={`${prefix}/pricing`}>
            {copy.pricing}
          </Link>
          <Link className="reference-button-secondary" to={`${prefix}/contact`}>
            {copy.help}
          </Link>
        </div>
      </div>
    </main>
  );
};
