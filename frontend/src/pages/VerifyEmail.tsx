import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { api } from "@/lib/api";

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage(isAr ? "رابط التحقق غير موجود أو غير صالح." : "Verification link is missing or invalid.");
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
        setMessage(e.response?.data?.message ?? (isAr ? "فشل التحقق من البريد الإلكتروني." : "Email verification failed."));
      });
  }, [isAr, searchParams]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12" style={{ backgroundColor: "var(--color-page)" }}>
      <div
        className="w-full max-w-md rounded-[28px] border p-8 text-center shadow-card"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {status === "loading" ? (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-brand-600" />
            <p className="mt-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>{isAr ? "جاري التحقق من بريدك..." : "Verifying your email..."}</p>
          </>
        ) : null}

        {status === "success" ? (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
            <h1 className="mt-3 font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>{isAr ? "تم التحقق من البريد" : "Email verified"}</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>{message}</p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center rounded-xl px-6 py-2.5 text-sm font-bold text-white no-underline shadow-sm transition-all hover:opacity-95"
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
            <h1 className="mt-3 font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>{isAr ? "فشل التحقق" : "Verification failed"}</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>{message}</p>
            <Link
              className="mt-5 inline-block text-sm font-medium text-brand-600 no-underline hover:underline"
              to={`${prefix}/login`}
            >
              {isAr ? "العودة لتسجيل الدخول" : "Back to login"}
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
};
