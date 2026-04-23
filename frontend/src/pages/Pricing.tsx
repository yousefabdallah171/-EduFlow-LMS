import { CheckCircle2, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { LandingPricingSection } from "@/components/landing/LandingPricingSection";

const copy = {
  ar: {
    badge: "تسعير واضح",
    title: "اختَر المسار المناسب وابدأ",
    accent: "تنفيذ مشروعك",
    subtitle:
      "باقتان واضحتان فقط: ابدأ بالكورس الأساسي لو هدفك تتقن الـ workflow كامل، أو خذ باقة المراجعة لو عندك مشروع تريد تسريع تنفيذه بقرارات أوضح.",
    trust: [
      { title: "دفعة واحدة", body: "لا يوجد اشتراك شهري أو رسوم خفية بعد الحجز." },
      { title: "وصول دائم", body: "المحتوى الأساسي وتحديثاته المستقبلية يظل داخل حسابك." },
      { title: "ضمان ملاءمة", body: "لو طبقت بجد والكورس لم يناسبك، عندك مسار واضح للتواصل." }
    ],
    recommended: "الاختيار المناسب لمعظم الطلاب",
    reviewTrack: "لمن يريد مراجعة مباشرة",
    oneTime: "دفعة واحدة. وصول دائم. بدون اشتراك شهري.",
    guaranteeTitle: "ضمان ملاءمة واضح",
    guaranteeBody: "لو طبقت بجد والكورس لم يناسبك، تواصل معنا خلال فترة الضمان وسنراجع الحالة بوضوح وسرعة.",
    reserve: "احجز هذه الباقة",
    compareTitle: "الفرق الحقيقي بين الباقتين",
    compareBody: "الكورس الأساسي مناسب لو تريد تتعلم النظام وتبني بنفسك. باقة المراجعة مناسبة لو عندك مشروع فعلي وتريد اختصار قرارات كثيرة بجلسة مباشرة.",
    contactCta: "اسأل قبل الحجز"
  },
  en: {
    badge: "Clear pricing",
    title: "Choose the track that fits",
    accent: "how you build",
    subtitle:
      "Two focused options only: start with the core course to master the workflow, or choose the review track if you want direct feedback on a real project.",
    trust: [
      { title: "One-time payment", body: "No monthly subscription and no hidden follow-up fees." },
      { title: "Lifetime access", body: "Your core content and future course updates stay inside your account." },
      { title: "Fit guarantee", body: "If you apply the workflow seriously and it is not a fit, there is a clear resolution path." }
    ],
    recommended: "Best fit for most students",
    reviewTrack: "Best for live review",
    oneTime: "One payment. Lifetime access. No monthly subscription.",
    guaranteeTitle: "A practical fit guarantee",
    guaranteeBody: "If you apply the workflow seriously and the course is not a fit, contact us during the guarantee window and we will review it clearly and fairly.",
    reserve: "Reserve this option",
    compareTitle: "How to choose between them",
    compareBody: "Choose the core course if your goal is to learn the system and build independently. Choose the review track if you already have a real project and want sharper decisions with direct feedback.",
    contactCta: "Ask before reserving"
  }
} as const;

export const Pricing = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const isAr = locale !== "en";
  const text = isAr ? copy.ar : copy.en;

  return (
    <main className="reference-page">
      <div className="reference-shell">
        <header className="reference-hero">
          <span className="reference-badge">
            <span className="reference-dot" aria-hidden="true" />
            {text.badge}
          </span>
          <h1 className="reference-title">
            {text.title} <span className="accent-word">{text.accent}</span>
          </h1>
          <p className="reference-subtitle">
            {text.subtitle}
          </p>
        </header>

        <section className="mb-10 grid gap-3 md:grid-cols-3">
          {text.trust.map((item, index) => (
            <div key={item.title} className={`reference-card p-5 ${index === 0 ? "reference-card--lime" : ""}`}>
              <div className="flex items-start gap-3">
                <span
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-brand-600"
                  style={{ backgroundColor: "var(--color-brand-muted)" }}
                >
                  {index === 0 ? <Sparkles className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                </span>
                <div>
                  <p className="text-sm font-black" style={{ color: "var(--color-text-primary)" }}>{item.title}</p>
                  <p className="mt-1 text-xs leading-6" style={{ color: "var(--color-text-secondary)" }}>{item.body}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <LandingPricingSection forceVisible prefix={prefix} showHeader={false} />

        <section className="reference-card mt-12 p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="m-0 font-display text-2xl font-black">{text.compareTitle}</h2>
              <p className="mt-2 leading-8" style={{ color: "var(--color-text-secondary)" }}>
                {text.compareBody}
              </p>
            </div>
            <Link className="reference-button-secondary" to={`${prefix}/contact`}>
              {text.contactCta}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
};
