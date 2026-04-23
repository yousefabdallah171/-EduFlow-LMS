import { Quote } from "lucide-react";
import { useParams } from "react-router-dom";

import { resolveLocale } from "@/lib/locale";
import { getPublicTrustCopy } from "@/lib/public-trust-copy";

export const Testimonials = () => {
  const { locale } = useParams();
  const copy = getPublicTrustCopy(resolveLocale(locale)).testimonials;

  return (
    <main className="reference-page">
      <div className="reference-shell">
        <header className="reference-hero">
          <span className="reference-badge">
            <span className="reference-dot" aria-hidden="true" />
            {copy.badge}
          </span>
          <h1 className="reference-title">
            {copy.title} <span className="accent-word">{copy.accent}</span>
          </h1>
          <p className="reference-subtitle">{copy.subtitle}</p>
        </header>

        <div className="reference-grid">
          {copy.items.map((item, index) => (
            <article
              className={`reference-card p-6 ${index === 1 ? "reference-card--lime" : ""}`}
              key={item.name}
            >
              <Quote className="h-7 w-7 text-brand-600" />
              <p className="mt-5 leading-8" style={{ color: "var(--color-text-secondary)" }}>
                "{item.quote}"
              </p>
              <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--color-border)" }}>
                <p className="m-0 font-black">{item.name}</p>
                <span className="reference-chip mt-2">{item.badge}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
};
