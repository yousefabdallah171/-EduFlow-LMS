import { type FormEvent, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useEnrollment } from "@/hooks/useEnrollment";
import { api } from "@/lib/api";

export const Checkout = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const { statusQuery, validateCoupon, checkout } = useEnrollment();
  const [couponCode, setCouponCode] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [message, setMessage] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);

  const courseQuery = useQuery({
    queryKey: ["course-summary"],
    queryFn: async () => {
      const response = await api.get<{ priceEgp: number; currency: string }>("/course");
      return response.data;
    }
  });

  const couponPreview = validateCoupon.data;
  const isAlreadyEnrolled = statusQuery.data?.enrolled && statusQuery.data?.status === "ACTIVE";

  const basePrice = courseQuery.data?.priceEgp ?? 499;
  const currency = courseQuery.data?.currency ?? "EGP";

  const priceLabel = useMemo(() => {
    if (couponPreview?.valid) return `${couponPreview.discountedAmountEgp.toFixed(2)} ${currency}`;
    return `${basePrice.toFixed(2)} ${currency}`;
  }, [couponPreview, basePrice, currency]);

  const savingsLabel = useMemo(() => {
    if (!couponPreview?.valid) return null;
    const saved = basePrice - couponPreview.discountedAmountEgp;
    return `You save ${saved.toFixed(2)} ${currency}`;
  }, [couponPreview, basePrice, currency]);

  const handleValidateCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await validateCoupon.mutateAsync(couponInput);
    setCouponCode(couponInput);
  };

  const handleCheckout = async () => {
    setMessage("");
    try {
      const result = await checkout.mutateAsync(couponCode || undefined);
      window.location.assign(
        `https://accept.paymob.com/api/acceptance/iframes/${result.iframeId}?payment_token=${result.paymentKey}`
      );
    } catch (error: unknown) {
      const apiError = error as AxiosError<{ message?: string }>;
      setMessage(apiError.response?.data?.message ?? "Checkout failed. Please try again.");
    }
  };

  const checkPoints = [
    { icon: "▶", text: isAr ? "وصول مدى الحياة لجميع الدروس" : "Lifetime access to all lessons" },
    { icon: "◉", text: isAr ? "حماية بعلامة مائية ديناميكية" : "Dynamic watermark protection" },
    { icon: "◈", text: isAr ? "تتبع تقدمك درساً بدرس" : "Track your progress lesson by lesson" },
    { icon: "◎", text: isAr ? "محتوى ثنائي اللغة عربي وإنجليزي" : "Arabic & English bilingual content" },
    { icon: "◇", text: isAr ? "استأنف من أي جهاز وأي وقت" : "Resume from any device, any time" }
  ];

  // Already enrolled — show success state
  if (isAlreadyEnrolled) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 py-12" style={{ backgroundColor: "var(--color-page)" }}>
        <div
          className="w-full max-w-md rounded-2xl border p-8 text-center shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-600 dark:bg-green-900/30 dark:text-green-400">
            ✓
          </div>
          <h1 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {t("checkout.alreadyEnrolled")}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {t("checkout.enrolled")}
          </p>
          <Link
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white no-underline shadow-sm transition-all hover:bg-brand-700"
            to={`${prefix}/course`}
          >
            {t("checkout.goToCourse")}
            <span className="icon-dir">→</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh px-4 py-10 sm:px-6" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="mx-auto max-w-5xl">

        {/* Page heading */}
        <div className="mb-8 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">
            {isAr ? "دفع آمن" : "Secure checkout"}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "var(--color-text-primary)" }}>
            {t("checkout.title")}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("preview.onePayment")}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

          {/* Left — course value */}
          <div className="space-y-5">
            {/* What's included */}
            <div
              className="rounded-2xl border p-6 shadow-card"
              style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">{t("checkout.whatsIncluded")}</p>
              <ul className="mt-4 space-y-3">
                {checkPoints.map((point) => (
                  <li key={point.text} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-brand-600" style={{ backgroundColor: "var(--color-brand-muted)" }}>
                      <span className="text-xs">{point.icon}</span>
                    </span>
                    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{point.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Trust signals */}
            <div
              className="rounded-2xl border p-5 shadow-card"
              style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { icon: "🔒", label: t("checkout.securePayment"), sub: isAr ? "مدعوم بـ Paymob" : "Powered by Paymob" },
                  { icon: "♾", label: t("checkout.lifetimeAccess"), sub: isAr ? "بدون انتهاء صلاحية أبداً" : "No expiry, ever" },
                  { icon: "✉", label: t("checkout.instantActivation"), sub: isAr ? "وصول خلال ثوانٍ" : "Access within seconds" }
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <p className="text-2xl">{item.icon}</p>
                    <p className="mt-1.5 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{item.label}</p>
                    <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>{item.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — payment card */}
          <div
            className="rounded-2xl border p-6 shadow-elevated"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            {/* Price display */}
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "var(--color-surface-2)", borderColor: "var(--color-border-strong)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>
                {t("checkout.coursePrice")}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="text-3xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                  {priceLabel}
                </p>
                {couponPreview?.valid && (
                  <p className="text-sm font-semibold text-green-600 line-through dark:text-green-400">
                    {basePrice.toFixed(2)} {currency}
                  </p>
                )}
              </div>
              {savingsLabel ? (
                <p className="mt-1.5 text-xs font-semibold text-green-600 dark:text-green-400">{savingsLabel}</p>
              ) : null}
            </div>

            {/* Coupon section */}
            <div className="mt-4">
              <button
                className="flex w-full items-center justify-between py-2 text-xs font-semibold transition-colors hover:text-brand-600"
                style={{ color: "var(--color-text-muted)" }}
                onClick={() => setCouponOpen((v) => !v)}
                type="button"
              >
                {t("checkout.haveCoupon")}
                <span className="text-base font-thin transition-transform duration-200" style={{ transform: couponOpen ? "rotate(45deg)" : "none" }}>+</span>
              </button>

              {couponOpen ? (
                <form className="mt-2" onSubmit={handleValidateCoupon}>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-lg border px-3 py-2 text-sm font-mono uppercase outline-none transition-all focus:ring-2 focus:ring-brand-600/30 placeholder:opacity-40 placeholder:normal-case"
                      style={{
                        backgroundColor: "var(--color-surface-2)",
                        borderColor: "var(--color-border-strong)",
                        color: "var(--color-text-primary)"
                      }}
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="SAVE20"
                    />
                    <button
                      className="rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface2 disabled:opacity-50"
                      style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                      disabled={validateCoupon.isPending}
                      type="submit"
                    >
                      {validateCoupon.isPending ? t("checkout.applying") : t("checkout.apply")}
                    </button>
                  </div>

                  {couponPreview ? (
                    couponPreview.valid ? (
                      <p className="mt-2 text-xs font-semibold text-green-600 dark:text-green-400">
                        ✓ {t("checkout.couponApplied", { amount: couponPreview.discountedAmountEgp.toFixed(2) })}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-red-500">
                        {couponPreview.reason ?? (isAr ? "رمز القسيمة غير صالح" : "Invalid coupon code")}
                      </p>
                    )
                  ) : null}
                </form>
              ) : null}
            </div>

            <div className="my-4 h-px" style={{ backgroundColor: "var(--color-border)" }} />

            {/* CTA */}
            <button
              className="w-full rounded-xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow disabled:opacity-50"
              disabled={checkout.isPending}
              onClick={() => void handleCheckout()}
              type="button"
            >
              {checkout.isPending
                ? t("checkout.paying")
                : t("checkout.payAndGetAccess", { price: priceLabel })}
            </button>

            {message ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                {message}
              </p>
            ) : null}

            <p className="mt-4 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
              {t("checkout.securedByPaymob")}
            </p>

            <div className="mt-3 text-center">
              <Link
                className="text-xs font-medium text-brand-600 no-underline hover:underline"
                to={`${prefix}/`}
              >
                {t("checkout.backToOverview")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
