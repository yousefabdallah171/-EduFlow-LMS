import { Quote } from "lucide-react";
import { testimonialsAr } from "@/lib/public-page-content";

export const Testimonials = () => (
  <main className="reference-page">
    <div className="reference-shell">
      <header className="reference-hero">
        <span className="reference-badge">
          <span className="reference-dot" aria-hidden="true" />
          قصص من الـ workflow
        </span>
        <h1 className="reference-title">
          ناس بتبني أسرع <span className="accent-word">وبنظام أوضح</span>
        </h1>
        <p className="reference-subtitle">
          الهدف مش إنك تحفظ أدوات جديدة. الهدف إنك تخرج من كل مرحلة بخطوة قابلة للتنفيذ على مشروع حقيقي.
        </p>
      </header>

      <div className="reference-grid">
        {testimonialsAr.map((item, index) => (
          <article
            className={`reference-card p-6 ${index === 1 ? "reference-card--lime" : ""}`}
            key={item.name}
          >
            <Quote className="h-7 w-7 text-brand-600" />
            <p className="mt-5 leading-8" style={{ color: "var(--color-text-secondary)" }}>
              “{item.quote}”
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
