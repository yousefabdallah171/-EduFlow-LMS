import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AuthShell } from "@/components/shared/AuthShell";
import { api } from "@/lib/api";
import { resolveLocale } from "@/lib/locale";

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t, i18n } = useTranslation();
  const isAr = resolveLocale(i18n.language) === "ar";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  const copy = useMemo(
    () => ({
      loading: isAr ? "جار التحقق من بريدك..." : "Verifying your email...",
      successTitle: isAr ? "تم التحقق من البريد" : "Email verified",
      errorTitle: isAr ? "فشل التحقق" : "Verification failed",
      missingToken: isAr ? "رابط التحقق مفقود أو غير صالح." : "Verification link is missing or invalid.",
      genericError: isAr ? "تعذر التحقق من البريد الإلكتروني." : "Email verification failed.",
      backToLogin: isAr ? "العودة إلى تسجيل الدخول" : "Back to login"
    }),
    [isAr]
  );

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage(copy.missingToken);
      return;
    }

    void api
      .get<{ message: string }>("/auth/verify-email", { params: { token } })
      .then((r) => {
        setStatus("success");
        setMessage(r.data.message);
      })
      .catch((e: { response?: { data?: { message?: string } } }) => {
        setStatus("error");
        setMessage(e.response?.data?.message ?? copy.genericError);
      });
  }, [copy.genericError, copy.missingToken, searchParams]);

  return (
    <AuthShell
      badge={isAr ? "تأكيد الحساب" : "Confirm your account"}
      title={isAr ? "التحقق من البريد الإلكتروني" : "Verify your email address"}
      subtitle={isAr ? "نؤكد ملكية البريد قبل فتح الوصول الكامل للحساب والدورة." : "We confirm your email before unlocking full account and course access."}
      highlights={[
        {
          title: isAr ? "خطوة أمان مهمة" : "A key security step",
          description: isAr
            ? "التحقق من البريد يربط حسابك بشكل صحيح بالوصول إلى الدورة والإشعارات."
            : "Verification keeps your account, enrollment access, and email notifications properly connected."
        },
        {
          title: isAr ? "بعدها تصبح الرحلة أوضح" : "A clearer next step after this",
          description: isAr
            ? "بعد نجاح التحقق يمكنك تسجيل الدخول بثقة ومتابعة بقية الخطوات."
            : "Once this succeeds, you can head back to login and continue with confidence."
        },
        {
          title: isAr ? "رسائل مباشرة" : "Direct status feedback",
          description: isAr
            ? "ستعرف فورا إن كان الرابط صالحا أو تحتاج إلى محاولة جديدة."
            : "The page makes it obvious whether the link worked or whether you need a new attempt."
        }
      ]}
      aside={
        <p className="text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
          {isAr
            ? "إذا انتهت صلاحية الرابط، يمكنك العودة وتسجيل الدخول أو طلب رابط جديد من تدفق الحساب."
            : "If the link has expired, you can return to login and request a fresh verification path from the account flow."}
        </p>
      }
      footer={
        <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          <Link className="font-semibold text-brand-600 no-underline hover:underline" to={`${prefix}/login`}>
            {t("auth.login.signIn")}
          </Link>
        </p>
      }
    >
      <div className="content-stack gap-5 text-center">
        {status === "loading" ? (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
            <p className="text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
              {copy.loading}
            </p>
          </>
        ) : null}

        {status === "success" ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              {copy.successTitle}
            </h2>
            <p className="text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
              {message}
            </p>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl px-6 py-3 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
              style={{ background: "var(--gradient-brand)" }}
              to={`${prefix}/login`}
            >
              {t("auth.login.signIn")}
            </Link>
          </>
        ) : null}

        {status === "error" ? (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              {copy.errorTitle}
            </h2>
            <p className="text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
              {message}
            </p>
            <Link className="text-sm font-medium text-brand-600 no-underline hover:underline" to={`${prefix}/login`}>
              {copy.backToLogin}
            </Link>
          </>
        ) : null}
      </div>
    </AuthShell>
  );
};
