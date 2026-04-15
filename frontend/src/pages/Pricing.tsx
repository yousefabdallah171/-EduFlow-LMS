import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

const included = [
  "Full access to all lessons",
  "Session-protected HLS streaming",
  "Arabic & English bilingual support",
  "Lifetime access — no subscription",
  "Resume from last position on any device",
  "Drip-unlocked content schedule",
  "Dynamic watermark protection",
  "Future lesson updates included",
];

export const Pricing = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t } = useTranslation();
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrollDir, setScrollDir] = useState<"up" | "down">("down");

  useEffect(() => {
    void api.get<{ priceEgp: number }>("/course").then((r) => { setPrice(r.data.priceEgp); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let last = window.scrollY;
    const handler = () => { setScrollDir(window.scrollY < last ? "up" : "down"); last = window.scrollY; };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-dvh pb-16 md:pb-0" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="mx-auto max-w-3xl px-6 py-16">

        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t("pricing.oneTimePayment")}</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("pricing.title")}
          </h1>
          <p className="mt-3 text-base" style={{ color: "var(--color-text-secondary)" }}>
            {t("pricing.subtitle")}
          </p>
        </div>

        <div
          className="rounded-2xl border p-8 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          {/* Price */}
          <div className="mb-8 text-center">
            {loading ? (
              <Skeleton className="mx-auto h-14 w-40" />
            ) : (
              <p className="text-5xl font-bold text-brand-600">
                {price !== null ? t("pricing.price", { price }) : "—"}
              </p>
            )}
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>{t("pricing.oneTimePayment")}</p>
          </div>

          {/* Included */}
          <div className="mb-8">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-brand-600">{t("pricing.includes")}</p>
            <ul className="space-y-2.5">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                  <span className="mt-0.5 flex-shrink-0 text-brand-600">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Guarantee badge */}
          <div
            className="mb-8 flex items-center gap-3 rounded-xl p-4"
            style={{ backgroundColor: "var(--color-surface-2)", borderColor: "var(--color-border)" }}
          >
            <span className="text-2xl">🛡️</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{t("pricing.guarantee")}</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>No questions asked.</p>
            </div>
          </div>

          <Link
            className="block w-full rounded-xl bg-brand-600 py-4 text-center text-sm font-bold text-white no-underline transition-all hover:bg-brand-700 hover:shadow-md"
            to={`${prefix}/checkout`}
          >
            {t("pricing.cta")} <span className="icon-dir opacity-70">→</span>
          </Link>
        </div>
      </div>

      {/* Sticky mobile CTA */}
      <div
        className={`fixed bottom-0 start-0 end-0 z-40 border-t px-4 py-3 transition-transform duration-300 md:hidden ${scrollDir === "up" ? "translate-y-full" : "translate-y-0"}`}
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <Link
          className="block w-full rounded-xl bg-brand-600 py-3 text-center text-sm font-bold text-white no-underline"
          to={`${prefix}/checkout`}
        >
          {t("pricing.cta")}
        </Link>
      </div>
    </div>
  );
};
