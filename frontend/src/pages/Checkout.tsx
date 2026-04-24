import { type FormEvent, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Globe2,
  Infinity,
  LockKeyhole,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  TimerReset
} from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useEnrollment } from "@/hooks/useEnrollment";
import { api } from "@/lib/api";
import { CACHE_TIME, getGCTime } from "@/lib/query-config";
import { PageHeader } from "@/components/shared/PageHeader";
import { resolveLocale } from "@/lib/locale";

export const Checkout = () => {
  const { locale } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t, i18n } = useTranslation();
  const isAr = resolveLocale(i18n.language) === "ar";
  const { statusQuery, validateCoupon, checkout } = useEnrollment();
  const [couponCode, setCouponCode] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [message, setMessage] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);

  const courseQuery = useQuery({
    queryKey: ["course"],
    queryFn: async () => {
      const response = await api.get<{
        priceEgp: number;
        currency: string;
        packages?: Array<{
          id: string;
          titleEn: string;
          titleAr: string;
          descriptionEn?: string | null;
          descriptionAr?: string | null;
          priceEgp: number;
          currency: string;
        }>;
      }>("/course");
      return response.data;
    },
    staleTime: CACHE_TIME.MEDIUM,
    gcTime: getGCTime(CACHE_TIME.MEDIUM)
  });

  const couponPreview = validateCoupon.data;
  const isAlreadyEnrolled = statusQuery.data?.enrolled && statusQuery.data?.status === "ACTIVE";

  const packages = courseQuery.data?.packages ?? [];
  const selectedPackageId = searchParams.get("package") ?? packages[0]?.id;
  const selectedPackage = packages.find((coursePackage) => coursePackage.id === selectedPackageId) ?? packages[0];
  const basePrice = selectedPackage?.priceEgp ?? courseQuery.data?.priceEgp ?? 1000;
  const currency = selectedPackage?.currency ?? courseQuery.data?.currency ?? "EGP";

  const priceLabel = useMemo(() => {
    if (couponPreview?.valid) return `${couponPreview.discountedAmountEgp.toFixed(2)} ${currency}`;
    return `${basePrice.toFixed(2)} ${currency}`;
  }, [couponPreview, basePrice, currency]);

  const savingsLabel = useMemo(() => {
    if (!couponPreview?.valid) return null;
    const saved = basePrice - couponPreview.discountedAmountEgp;
    return t("checkout.savingsLabel", { amount: saved.toFixed(2), currency });
  }, [couponPreview, basePrice, currency, t]);

  const handleValidateCoupon = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await validateCoupon.mutateAsync({ couponCode: couponInput, packageId: selectedPackage?.id });
    setCouponCode(couponInput);
  };

  const handleCheckout = async () => {
    setMessage("");
    try {
      const result = await checkout.mutateAsync({ couponCode: couponCode || undefined, packageId: selectedPackage?.id });
      window.location.assign(
        `https://accept.paymob.com/api/acceptance/iframes/${result.iframeId}?payment_token=${result.paymentKey}`
      );
    } catch (error: unknown) {
      const apiError = error as AxiosError<{ message?: string }>;
      setMessage(apiError.response?.data?.message ?? t("checkout.errorMessage"));
    }
  };

  const checkPoints = [
    { icon: PlayCircle, text: t("checkout.included.workflow") },
    { icon: ShieldCheck, text: t("checkout.included.protectedPlayback") },
    { icon: Sparkles, text: t("checkout.included.templates") },
    { icon: Globe2, text: t("checkout.included.arEnSupport") },
    { icon: TimerReset, text: t("checkout.included.lifetimeAccess") }
  ];

  const trustSignals = [
    { icon: LockKeyhole, label: t("checkout.securePayment"), sub: t("checkout.trust.paymob") },
    { icon: Infinity, label: t("checkout.lifetimeAccess"), sub: t("checkout.trust.noExpiry") },
    { icon: Check, label: t("checkout.instantActivation"), sub: t("checkout.trust.accessSeconds") }
  ];

  const decisionBullets = [
    t("checkout.decisionBullets.clear"),
    t("checkout.decisionBullets.activation"),
    t("checkout.decisionBullets.questions")
  ];

  if (isAlreadyEnrolled) {
    return (
      <div className="dashboard-page flex min-h-dvh items-center justify-center px-6 py-12" style={{ backgroundColor: "var(--color-page)" }}>
        <div
          className="dashboard-panel dashboard-panel--strong w-full max-w-md p-8 text-center"
        >
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              backgroundColor: "color-mix(in oklab, var(--color-brand) 12%, var(--color-surface))",
              border: "1px solid color-mix(in oklab, var(--color-brand) 22%, transparent)",
              color: "var(--color-brand-text)",
            }}
          >
            <Check className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {t("checkout.alreadyEnrolled")}
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {t("checkout.enrolled")}
          </p>
          <Link
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
            style={{ background: "var(--gradient-brand)" }}
            to={`${prefix}/course`}
          >
            {t("checkout.goToCourse")}
            <ArrowRight className="icon-dir h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page min-h-dvh px-4 py-10 sm:px-6" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="app-shell app-shell--compact">
        <PageHeader
          hero
          eyebrow={t("checkout.eyebrow")}
          title={t("checkout.title")}
          description={t("preview.onePayment")}
        />

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            {packages.length > 1 ? (
              <div className="dashboard-panel p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">
                  {t("checkout.choosePackage")}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {packages.map((coursePackage) => {
                    const active = coursePackage.id === selectedPackage?.id;
                    return (
                      <button
                        key={coursePackage.id}
                        className="rounded-2xl border p-4 text-start transition-all hover:-translate-y-0.5"
                        style={{
                          backgroundColor: active ? "var(--color-brand-muted)" : "var(--color-surface-2)",
                          borderColor: active ? "var(--color-brand)" : "var(--color-border)"
                        }}
                        onClick={() => setSearchParams({ package: coursePackage.id })}
                        type="button"
                      >
                        <p className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                          {isAr ? coursePackage.titleAr : coursePackage.titleEn}
                        </p>
                        <p className="mt-2 text-xs leading-6" style={{ color: "var(--color-text-secondary)" }}>
                          {isAr ? coursePackage.descriptionAr : coursePackage.descriptionEn}
                        </p>
                        <p className="mt-3 font-display text-2xl font-black text-brand-600">
                          {coursePackage.priceEgp} {coursePackage.currency}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="dashboard-panel p-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">{t("checkout.whatsIncluded")}</p>
              <ul className="mt-4 space-y-3">
                {checkPoints.map((point) => {
                  const Icon = point.icon;

                  return (
                    <li key={point.text} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-brand-600" style={{ backgroundColor: "var(--color-brand-muted)" }}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{point.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="dashboard-panel p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                {trustSignals.map((item) => {
                  const Icon = item.icon;

                  return (
                    <div key={item.label} className="text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl text-brand-600" style={{ backgroundColor: "var(--color-brand-muted)" }}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="mt-1.5 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{item.label}</p>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>{item.sub}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="dashboard-panel p-6">
              <div className="section-heading">
                <p className="section-heading__eyebrow">{t("checkout.beforePay.eyebrow")}</p>
                <h2 className="section-heading__title">{t("checkout.beforePay.title")}</h2>
                <p className="section-heading__description">
                  {t("checkout.beforePay.description")}
                </p>
              </div>
              <ul className="mt-5 space-y-3">
                {decisionBullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-3">
                    <span className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-brand-600" style={{ backgroundColor: "var(--color-brand-muted)" }}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="dashboard-panel dashboard-panel--strong p-6 lg:sticky lg:top-28 lg:h-fit">
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: "var(--color-surface-2)", borderColor: "var(--color-border-strong)" }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {selectedPackage ? (isAr ? selectedPackage.titleAr : selectedPackage.titleEn) : t("checkout.coursePrice")}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <p className="font-display text-3xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>
                  {priceLabel}
                </p>
                {couponPreview?.valid ? (
                  <p className="text-sm font-semibold text-green-600 line-through dark:text-green-400">
                    {basePrice.toFixed(2)} {currency}
                  </p>
                ) : null}
              </div>
              {savingsLabel ? (
                <p className="mt-1.5 text-xs font-semibold text-green-600 dark:text-green-400">{savingsLabel}</p>
              ) : null}
            </div>

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
                      className="flex-1 rounded-lg border px-3 py-2 text-sm uppercase outline-none transition-all focus:ring-2 focus:ring-brand-600/30 placeholder:opacity-40 placeholder:normal-case"
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
                        <Check className="inline h-3.5 w-3.5" /> {t("checkout.couponApplied", { amount: couponPreview.discountedAmountEgp.toFixed(2) })}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs text-red-500">
                        {couponPreview.reason ?? t("checkout.invalidCoupon")}
                      </p>
                    )
                  ) : null}
                </form>
              ) : null}
            </div>

            <div className="my-4 h-px" style={{ backgroundColor: "var(--color-border)" }} />

            <button
              className="w-full rounded-xl py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 hover:shadow disabled:opacity-50"
              style={{ background: "var(--gradient-brand)" }}
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

            <div className="mt-5 grid gap-2 text-center">
              <Link className="text-xs font-medium text-brand-600 no-underline hover:underline" to={`${prefix}/pricing`}>
                {t("checkout.comparePackagesAgain")}
              </Link>
              <Link
                className="text-xs font-medium no-underline hover:underline"
                style={{ color: "var(--color-text-muted)" }}
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
