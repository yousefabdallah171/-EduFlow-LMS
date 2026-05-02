import { AlertCircle, ArrowRight, RotateCcw } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/shared/SEO";
import { SEO_PAGES } from "@/lib/seo-config";
import {
  getPaymentError,
  shouldShowRetryButton,
  shouldShowSupportButton,
  shouldShowDashboardButton
} from "@/utils/paymentErrors";

export const PaymentFailure = () => {
  const { locale } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";

  // Extract error info from URL
  const errorCode = searchParams.get("error");
  const orderId = searchParams.get("orderId");
  const amount = searchParams.get("amount");

  const error = getPaymentError(errorCode || undefined);
  const showRetry = errorCode && shouldShowRetryButton(errorCode);
  const showSupport = errorCode && shouldShowSupportButton(errorCode);
  const showDashboard = errorCode && shouldShowDashboardButton(errorCode);

  const handleRetry = () => {
    // Redirect back to checkout with same package
    const params = new URLSearchParams(window.location.search);
    params.delete("error");
    params.delete("orderId");
    params.delete("amount");
    const query = params.toString();
    window.location.href = `${prefix}/checkout${query ? `?${query}` : ""}`;
  };

  return (
    <div className="dashboard-page min-h-dvh px-4 py-12 sm:px-6" style={{ backgroundColor: "var(--color-page)" }}>
      <SEO page={SEO_PAGES.paymentFailure} />
      <div className="mx-auto max-w-2xl">
        {/* Error Icon */}
        <div className="mb-8 flex justify-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full animate-in fade-in zoom-in duration-500"
            style={{
              backgroundColor: "color-mix(in oklab, rgb(239, 68, 68) 12%, var(--color-surface))",
              border: "2px solid rgb(239, 68, 68)"
            }}
          >
            <AlertCircle className="h-10 w-10" style={{ color: "rgb(239, 68, 68)" }} />
          </div>
        </div>

        {/* Error Message */}
        <div className="dashboard-panel dashboard-panel--strong mb-8 p-8 text-center">
          <h1 className="font-display text-3xl font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
            {error.title}
          </h1>
          <p className="text-lg mb-6" style={{ color: "var(--color-text-secondary)" }}>
            {error.message}
          </p>

          {/* Error Details */}
          {orderId && (
            <div
              className="rounded-lg p-6 mb-8 space-y-3"
              style={{ backgroundColor: "var(--color-surface-2)" }}
            >
              {orderId && (
                <>
                  <div className="flex justify-between items-center">
                    <span style={{ color: "var(--color-text-muted)" }} className="text-sm font-medium">
                      {t("paymentFailure.orderId")}
                    </span>
                    <span style={{ color: "var(--color-text-primary)" }} className="text-sm font-bold font-mono">
                      {orderId}
                    </span>
                  </div>
                  <div className="h-px" style={{ backgroundColor: "var(--color-border)" }} />
                </>
              )}
              {amount && (
                <>
                  <div className="flex justify-between items-center">
                    <span style={{ color: "var(--color-text-muted)" }} className="text-sm font-medium">
                      {t("paymentFailure.attemptedAmount")}
                    </span>
                    <span style={{ color: "var(--color-text-primary)" }} className="text-lg font-bold">
                      {amount}
                    </span>
                  </div>
                  <div className="h-px" style={{ backgroundColor: "var(--color-border)" }} />
                </>
              )}
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--color-text-muted)" }} className="text-sm font-medium">
                  {t("paymentFailure.status")}
                </span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  {t("paymentFailure.statusFailed")}
                </span>
              </div>
            </div>
          )}

          {/* Suggestion Box */}
          <div
            className="rounded-lg p-4 mb-8 text-left"
            style={{ backgroundColor: "color-mix(in oklab, rgb(239, 68, 68) 5%, var(--color-surface))" }}
          >
            <p className="text-sm font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
              {t("paymentFailure.whatToDoNow")}
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              {error.suggestion}
            </p>
          </div>

          {/* Charge Status */}
          <div className="mb-8 p-4 border border-amber-200 dark:border-amber-900/30 rounded-lg" style={{ backgroundColor: "color-mix(in oklab, rgb(245, 158, 11) 5%, var(--color-surface))" }}>
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2">
              💳 {t("paymentFailure.chargeStatus")}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {t("paymentFailure.chargeStatusDescription")}
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          {showRetry && (
            <button
              onClick={handleRetry}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
              style={{ background: "var(--gradient-brand)" }}
            >
              <RotateCcw className="h-4 w-4" />
              {t("paymentFailure.tryAgain")}
            </button>
          )}

          {showDashboard && (
            <Link
              to={`${prefix}/dashboard`}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
              style={{ background: "var(--gradient-brand)" }}
            >
              {t("paymentFailure.goToDashboard")}
              <ArrowRight className="icon-dir h-4 w-4" />
            </Link>
          )}

          {showSupport && (
            <a
              href="mailto:support@eduflow.com"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition-all hover:opacity-95 border"
              style={{ borderColor: "var(--color-border)" }}
            >
              {t("paymentFailure.contactSupport")}
            </a>
          )}

          {!showRetry && !showDashboard && (
            <Link
              to={`${prefix}/checkout`}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
              style={{ background: "var(--gradient-brand)" }}
            >
              {t("paymentFailure.backToCheckout")}
              <ArrowRight className="icon-dir h-4 w-4" />
            </Link>
          )}
        </div>

        {/* Additional Info */}
        <div className="text-center mb-8">
          <p className="text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
            {t("paymentFailure.needHelp")}
          </p>
          <a
            href="mailto:support@eduflow.com"
            className="text-sm font-medium text-brand-600 no-underline hover:underline"
          >
            {t("paymentFailure.supportEmail")}
          </a>
        </div>

        {/* Troubleshooting Tips */}
        <div className="dashboard-panel p-6">
          <h3 className="font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
            {t("paymentFailure.troubleshootingTitle")}
          </h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="font-semibold text-brand-600 flex-shrink-0 mt-0.5">1.</span>
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {t("paymentFailure.tip1")}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-semibold text-brand-600 flex-shrink-0 mt-0.5">2.</span>
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {t("paymentFailure.tip2")}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-semibold text-brand-600 flex-shrink-0 mt-0.5">3.</span>
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {t("paymentFailure.tip3")}
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="font-semibold text-brand-600 flex-shrink-0 mt-0.5">4.</span>
              <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {t("paymentFailure.tip4")}
              </span>
            </li>
          </ul>
        </div>

        {/* Error Code for Support */}
        {errorCode && (
          <p className="mt-8 text-center text-xs font-mono" style={{ color: "var(--color-text-muted)" }}>
            Error Code: {errorCode}
          </p>
        )}
      </div>
    </div>
  );
};
