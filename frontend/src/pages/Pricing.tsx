import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

type CoursePackage = {
  id: string;
  titleEn: string;
  titleAr: string;
  descriptionEn?: string | null;
  descriptionAr?: string | null;
  priceEgp: number;
  currency: string;
};

const packageFallbacks: CoursePackage[] = [
  {
    id: "core-course",
    titleEn: "AI Workflow Course",
    titleAr: "كورس AI Workflow",
    descriptionEn: "The full 7-phase workflow with lifetime access and future updates.",
    descriptionAr: "الـ workflow الكامل في ٧ مراحل مع وصول دائم وتحديثات مستقبلية.",
    priceEgp: 1000,
    currency: "EGP"
  },
  {
    id: "course-review-session",
    titleEn: "Course + Review Session",
    titleAr: "الكورس + جلسة مراجعة",
    descriptionEn: "Everything in the course plus one private project review session.",
    descriptionAr: "كل محتوى الكورس بالإضافة إلى جلسة مراجعة خاصة لمشروعك.",
    priceEgp: 2500,
    currency: "EGP"
  }
];

const features = [
  "الـ workflow الكامل من الفكرة إلى الـ production",
  "PRD وSpec Kit وClaude Code وCodex",
  "اتجاه UI قبل الكود بدل التنفيذ العشوائي",
  "مراجعة كود واختبارات E2E",
  "أمان وأداء وSEO وتتبع",
  "Docker وProduction وCI/CD",
  "مشاهدة محمية وتقدم محفوظ",
  "تحديثات مستقبلية بدون اشتراك"
];

export const Pricing = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const [packages, setPackages] = useState<CoursePackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void api
      .get<{ priceEgp: number; currency: string; packages?: CoursePackage[] }>("/course")
      .then((response) => {
        setPackages(response.data.packages?.length ? response.data.packages : packageFallbacks);
      })
      .catch(() => setPackages(packageFallbacks))
      .finally(() => setLoading(false));
  }, []);

  const visiblePackages = useMemo(() => (packages.length ? packages : packageFallbacks).slice(0, 2), [packages]);

  return (
    <main className="reference-page">
      <div className="reference-shell">
        <header className="reference-hero">
          <span className="reference-badge">
            <span className="reference-dot" aria-hidden="true" />
            Early Access Pricing
          </span>
          <h1 className="reference-title">
            احجز مقعدك في <span className="accent-word">AI Workflow</span>
          </h1>
          <p className="reference-subtitle">
            باقتين واضحتين: ابدأ بالكورس الأساسي أو اختار باقة المراجعة لو عايز feedback مباشر على مشروعك.
          </p>
        </header>

        {loading ? (
          <div className="reference-grid">
            <Skeleton className="h-[520px] rounded-[18px]" />
            <Skeleton className="h-[520px] rounded-[18px]" />
          </div>
        ) : (
          <div className="reference-grid">
            {visiblePackages.map((coursePackage, index) => {
              const featured = index === 0;
              return (
                <article
                  className={`reference-card pricing-card-reference ${featured ? "reference-card--lime featured" : "reference-card--amber"}`}
                  key={coursePackage.id}
                >
                  {featured ? <span className="reference-chip self-start">Recommended</span> : <span className="reference-chip self-start">Review Track</span>}
                  <h2 className="mt-5 font-display text-2xl font-black">{coursePackage.titleAr}</h2>
                  <p className="mt-2 min-h-[56px] leading-8" style={{ color: "var(--color-text-secondary)" }}>
                    {coursePackage.descriptionAr}
                  </p>

                  <div className="pricing-price">
                    {coursePackage.priceEgp.toLocaleString("ar-EG")}
                    <span className="ms-2 text-base font-black">جنيه</span>
                  </div>
                  <p className="m-0 text-sm font-bold" style={{ color: "var(--color-text-muted)" }}>
                    دفعة واحدة. وصول دائم. بدون اشتراك شهري.
                  </p>

                  <ul className="pricing-features">
                    {features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>

                  <div className="mt-auto rounded-xl p-4" style={{ backgroundColor: "var(--color-surface-2)" }}>
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" />
                      <div>
                        <p className="m-0 text-sm font-black">ضمان ملاءمة واضح</p>
                        <p className="m-0 mt-1 text-xs leading-6" style={{ color: "var(--color-text-muted)" }}>
                          لو طبقت بجد والكورس لم يناسبك، تواصل معنا خلال فترة الضمان.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Link className="reference-button mt-6 w-full" to={`${prefix}/checkout?package=${coursePackage.id}`}>
                    احجز هذه الباقة
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        <section className="reference-card mt-12 p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h2 className="m-0 font-display text-2xl font-black">مش متأكد تختار إيه؟</h2>
              <p className="mt-2 leading-8" style={{ color: "var(--color-text-secondary)" }}>
                لو هدفك تتعلم النظام خُد الكورس الأساسي. لو عندك مشروع فعلي وعايز مراجعة مباشرة، اختار باقة المراجعة.
              </p>
            </div>
            <Link className="reference-button-secondary" to={`${prefix}/contact`}>
              اسأل قبل الحجز
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
};
