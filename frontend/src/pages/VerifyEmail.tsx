import { useEffect, useState } from "react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Verification link is missing or invalid.");
      return;
    }

    void api
      .get<{ message: string }>("/auth/verify-email", { params: { token } })
      .then((r) => { setStatus("success"); setMessage(r.data.message); })
      .catch((e: { response?: { data?: { message?: string } } }) => { setStatus("error"); setMessage(e.response?.data?.message ?? "Email verification failed."); });
  }, [searchParams]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12" style={{ backgroundColor: "var(--color-page)" }}>
      <div
        className="w-full max-w-md rounded-2xl border p-8 shadow-card text-center"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {status === "loading" && (
          <>
            <p className="text-2xl">⏳</p>
            <p className="mt-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>Verifying your email…</p>
          </>
        )}
        {status === "success" && (
          <>
            <p className="text-4xl">✓</p>
            <h1 className="mt-3 text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>Email verified!</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>{message}</p>
            <Link
              className="mt-5 inline-block rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white no-underline transition-all hover:bg-brand-700"
              to={`${prefix}/login`}
            >
              {t("auth.login.signIn")}
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-4xl">✗</p>
            <h1 className="mt-3 text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>Verification failed</h1>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>{message}</p>
            <Link
              className="mt-5 inline-block text-sm text-brand-600 no-underline hover:underline"
              to={`${prefix}/login`}
            >
              Back to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
