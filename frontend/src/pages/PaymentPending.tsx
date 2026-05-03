import { useEffect, useState } from "react";
import { Loader, AlertCircle, XCircle } from "lucide-react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { SEO } from "@/components/shared/SEO";
import { SEO_PAGES } from "@/lib/seo-config";

const MAX_WAIT_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const POLL_INTERVAL = 2000; // 2 seconds

export const PaymentPending = () => {
  const { locale } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";

  const orderId = searchParams.get("orderId");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  // Use custom hook to poll payment status
  const { status, error: statusError } = usePaymentStatus(orderId || "", POLL_INTERVAL);

  // Track elapsed time
  useEffect(() => {
    const startTime = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setElapsedTime(elapsed);

      if (elapsed > MAX_WAIT_TIME) {
        setTimedOut(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-redirect when payment completes
  useEffect(() => {
    if (status === "COMPLETED") {
      navigate(`${prefix}/payment/success?orderId=${orderId}`, { replace: true });
    } else if (status === "FAILED") {
      navigate(`${prefix}/payment/failure?orderId=${orderId}&error=PAYMENT_FAILED`, { replace: true });
    } else if (status === "CANCELLED") {
      navigate(`${prefix}/checkout`, { replace: true });
    }
  }, [status, orderId, navigate, prefix]);

  const minutes = Math.floor(elapsedTime / 60000);
  const seconds = Math.floor((elapsedTime % 60000) / 1000);
  const estimatedWait = minutes < 2 ? t("paymentPending.estimatedWaitShort") : t("paymentPending.estimatedWaitLong");

  const handleCancel = () => {
    if (confirm(t("paymentPending.cancelConfirm"))) {
      navigate(`${prefix}/checkout`, { replace: true });
    }
  };

  return (
    <div className="dashboard-page min-h-dvh px-4 py-12 sm:px-6 flex items-center justify-center" style={{ backgroundColor: "var(--color-page)" }}>
      <SEO page={SEO_PAGES.paymentPending} />
      <div className="mx-auto max-w-2xl w-full">
        <div className="dashboard-panel dashboard-panel--strong p-8 text-center">
          {/* Loading Spinner */}
          <div className="mb-8 flex justify-center">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full animate-spin" style={{
                background: "conic-gradient(var(--color-brand), transparent)",
                opacity: 0.3
              }} />
              <div className="absolute inset-2 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--color-surface)" }}>
                <Loader className="h-8 w-8 animate-spin" style={{ color: "var(--color-brand)" }} />
              </div>
            </div>
          </div>

          {/* Status Message */}
          <h1 className="font-display text-3xl font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
            {t("paymentPending.title")}
          </h1>
          <p className="text-lg mb-6" style={{ color: "var(--color-text-secondary)" }}>
            {t("paymentPending.description")}
          </p>

          {/* Order Details */}
          {orderId && (
            <div
              className="rounded-lg p-6 mb-8 space-y-3"
              style={{ backgroundColor: "var(--color-surface-2)" }}
            >
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--color-text-muted)" }} className="text-sm font-medium">
                  {t("paymentPending.orderId")}
                </span>
                <span style={{ color: "var(--color-text-primary)" }} className="text-sm font-bold font-mono">
                  {orderId}
                </span>
              </div>
              <div className="h-px" style={{ backgroundColor: "var(--color-border)" }} />
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--color-text-muted)" }} className="text-sm font-medium">
                  {t("paymentPending.status")}
                </span>
                <span className="flex items-center gap-2">
                  <Loader className="h-4 w-4 animate-spin" style={{ color: "var(--color-brand)" }} />
                  <span style={{ color: "var(--color-text-primary)" }} className="text-sm font-bold">
                    {t("paymentPending.statusProcessing")}
                  </span>
                </span>
              </div>
              <div className="h-px" style={{ backgroundColor: "var(--color-border)" }} />
              <div className="flex justify-between items-center">
                <span style={{ color: "var(--color-text-muted)" }} className="text-sm font-medium">
                  {t("paymentPending.elapsed")}
                </span>
                <span style={{ color: "var(--color-text-primary)" }} className="text-sm font-mono">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </span>
              </div>
            </div>
          )}

          {/* Waiting Message */}
          <div
            className="rounded-lg p-4 mb-8"
            style={{ backgroundColor: "color-mix(in oklab, var(--color-brand) 5%, var(--color-surface))" }}
          >
            <p className="text-sm font-medium mb-2" style={{ color: "var(--color-text-primary)" }}>
              ⏳ {t("paymentPending.waitingMessage")}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {estimatedWait}
            </p>
          </div>

          {/* Important Notice */}
          <div className="mb-8 p-4 border rounded-lg" style={{ borderColor: "var(--color-warning)", backgroundColor: "var(--color-warning-bg)" }}>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--color-warning)" }}>
              ⚠️ {t("paymentPending.importantNotice")}
            </p>
            <ul className="text-xs space-y-1 list-disc list-inside" style={{ color: "var(--color-warning)" }}>
              <li>{t("paymentPending.dontRefresh")}</li>
              <li>{t("paymentPending.dontClose")}</li>
              <li>{t("paymentPending.dontGoBack")}</li>
              <li>{t("paymentPending.willAutoRedirect")}</li>
            </ul>
          </div>

          {/* Error State */}
          {statusError && (
            <div className="mb-8 p-4 border rounded-lg" style={{ borderColor: "var(--color-danger)", backgroundColor: "var(--color-danger-bg)" }}>
              <p className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: "var(--color-danger)" }}>
                <AlertCircle className="h-4 w-4" />
                {t("paymentPending.checkError")}
              </p>
              <p className="text-xs" style={{ color: "var(--color-danger)" }}>
                {t("paymentPending.checkErrorDescription")}
              </p>
            </div>
          )}

          {/* Timeout State */}
          {timedOut && (
            <div className="mb-8 p-4 border rounded-lg" style={{ borderColor: "var(--color-warning)", backgroundColor: "var(--color-warning-bg)" }}>
              <p className="text-sm font-semibold flex items-center gap-2 mb-2" style={{ color: "var(--color-warning)" }}>
                <XCircle className="h-4 w-4" />
                {t("paymentPending.timeoutTitle")}
              </p>
              <p className="text-xs mb-3" style={{ color: "var(--color-warning)" }}>
                {t("paymentPending.timeoutDescription")}
              </p>
              <a
                href={`${prefix}/help`}
                className="text-xs font-semibold no-underline hover:underline"
                style={{ color: "var(--color-warning)" }}
              >
                {t("paymentPending.contactSupport")}
              </a>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            {!timedOut && (
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                {t("paymentPending.autoRedirectMessage")}
              </p>
            )}

            <button
              onClick={handleCancel}
              className="rounded-xl px-6 py-3.5 text-sm font-bold transition-all hover:opacity-90 border"
              style={{ borderColor: "var(--color-border)" }}
            >
              {t("paymentPending.cancelPayment")}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-8 border-t" style={{ borderColor: "var(--color-border)" }}>
            <p className="text-sm mb-2" style={{ color: "var(--color-text-secondary)" }}>
              {t("paymentPending.needHelp")}
            </p>
            <a
              href={`${prefix}/help`}
              className="text-sm font-medium text-brand-600 no-underline hover:underline"
            >
              {t("paymentPending.supportEmail")}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
