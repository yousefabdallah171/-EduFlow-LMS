import { Check, ArrowRight, Download, Mail } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/shared/SEO";
import { SEO_PAGES } from "@/lib/seo-config";

export const PaymentSuccess = () => {
  const { locale } = useParams();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";

  // Extract payment details from URL or state
  const orderId = searchParams.get("orderId") || "---";
  const amount = searchParams.get("amount") || "---";

  return (
    <div className="dashboard-page min-h-dvh px-4 py-12 sm:px-6" style={{ backgroundColor: "var(--color-page)" }}>
      <SEO page={SEO_PAGES.paymentSuccess} />
      <div className="mx-auto max-w-2xl">
        {/* Success Animation */}
        <div className="mb-8 flex justify-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full animate-in fade-in zoom-in duration-500"
            style={{
              backgroundColor: "color-mix(in oklab, var(--color-brand) 12%, var(--color-surface))",
              border: "2px solid var(--color-brand)"
            }}
          >
            <Check className="h-10 w-10" style={{ color: "var(--color-brand)" }} />
          </div>
        </div>

        {/* Success Message */}
        <div className="dashboard-panel dashboard-panel--strong mb-8 p-8 text-center">
          <h1 className="font-display text-3xl font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
            {t("paymentSuccess.title")}
          </h1>
          <p className="text-lg mb-6" style={{ color: "var(--color-text-secondary)" }}>
            {t("paymentSuccess.description")}
          </p>

          {/* Order Details */}
          <div
            className="rounded-lg p-6 mb-8 space-y-3"
            style={{ backgroundColor: "var(--color-surface-2)" }}
          >
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--color-text-muted)" }} className="text-sm font-medium">
                {t("paymentSuccess.orderId")}
              </span>
              <span style={{ color: "var(--color-text-primary)" }} className="text-sm font-bold font-mono">
                {orderId}
              </span>
            </div>
            <div className="h-px" style={{ backgroundColor: "var(--color-border)" }} />
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--color-text-muted)" }} className="text-sm font-medium">
                {t("paymentSuccess.amount")}
              </span>
              <span style={{ color: "var(--color-text-primary)" }} className="text-lg font-bold">
                {amount}
              </span>
            </div>
            <div className="h-px" style={{ backgroundColor: "var(--color-border)" }} />
            <div className="flex justify-between items-center">
              <span style={{ color: "var(--color-text-muted)" }} className="text-sm font-medium">
                {t("paymentSuccess.status")}
              </span>
              <span className="text-sm font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="h-4 w-4" />
                {t("paymentSuccess.statusCompleted")}
              </span>
            </div>
          </div>

          {/* Confirmation Notice */}
          <div
            className="rounded-lg p-4 mb-8 flex items-start gap-3"
            style={{ backgroundColor: "color-mix(in oklab, var(--color-brand) 5%, var(--color-surface))" }}
          >
            <Mail className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--color-brand)" }} aria-hidden="true" />
            <div className="text-start">
              <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                {t("paymentSuccess.emailSent")}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
                {t("paymentSuccess.emailDescription")}
              </p>
            </div>
          </div>

          {/* Enrollment Confirmation */}
          <div className="mb-8 p-4 border border-green-200 dark:border-green-900/30 rounded-lg" style={{ backgroundColor: "color-mix(in oklab, rgb(34, 197, 94) 5%, var(--color-surface))" }}>
            <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
              ✓ {t("paymentSuccess.enrollmentActive")}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {t("paymentSuccess.enrollmentDescription")}
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="grid gap-3 sm:grid-cols-2 mb-6">
          <Link
            to={`${prefix}/dashboard`}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
            style={{ background: "var(--gradient-brand)" }}
          >
            {t("paymentSuccess.accessCourse")}
            <ArrowRight className="icon-dir h-4 w-4" />
          </Link>

          <button
            onClick={() => {
              const lines = [
                `${t("paymentSuccess.orderId")}: ${orderId}`,
                `${t("paymentSuccess.amount")}: ${amount}`,
                `${t("paymentSuccess.status")}: ${t("paymentSuccess.statusCompleted")}`
              ];
              const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `receipt-${orderId}.txt`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-bold transition-all hover:opacity-95 border"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t("paymentSuccess.downloadReceipt")}
          </button>
        </div>

        {/* Help Text */}
        <div className="text-center">
          <p className="text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
            {t("paymentSuccess.anyQuestions")}
          </p>
          <a
            href={`${prefix}/help`}
            className="text-sm font-medium text-brand-600 no-underline hover:underline"
          >
            {t("paymentSuccess.contactSupport")}
          </a>
        </div>

        {/* Additional Info */}
        <div className="mt-8 pt-8 border-t" style={{ borderColor: "var(--color-border)" }}>
          <div className="grid gap-4 sm:grid-cols-3 text-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600 mb-2">
                {t("paymentSuccess.access")}
              </p>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {t("paymentSuccess.accessImmediate")}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600 mb-2">
                {t("paymentSuccess.lifetime")}
              </p>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {t("paymentSuccess.lifetimeValue")}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600 mb-2">
                {t("paymentSuccess.security")}
              </p>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {t("paymentSuccess.securityValue")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
