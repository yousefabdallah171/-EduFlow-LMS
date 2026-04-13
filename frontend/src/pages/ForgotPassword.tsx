import { type FormEvent, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

const fieldClass = "mt-1.5 block w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-brand-600/30";
const fieldStyle = {
  backgroundColor: "var(--color-surface-2)",
  borderColor: "var(--color-border-strong)",
  color: "var(--color-text-primary)"
};

export const ForgotPassword = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await api.post<{ message: string }>("/auth/forgot-password", { email });
      setMessage(response.data.message);
      setIsSuccess(true);
    } catch (error: unknown) {
      const apiError = error as AxiosError<{ message?: string }>;
      setMessage(apiError.response?.data?.message ?? "Failed to send reset link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 shadow-elevated">
            <span className="text-xl font-bold text-white">E</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("auth.forgotPassword.title")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("auth.forgotPassword.subtitle")}
          </p>
        </div>

        {isSuccess ? (
          <div
            className="rounded-2xl border p-6 text-center shadow-card"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              ✓
            </div>
            <h2 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>{t("auth.forgotPassword.checkEmail")}</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>{message}</p>
            <Link
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white no-underline"
              to={`${prefix}/login`}
            >
              {t("auth.login.signIn")}
            </Link>
          </div>
        ) : (
          <form
            className="rounded-2xl border p-6 shadow-card"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            onSubmit={submit}
          >
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }} htmlFor="email">
                {t("common.email")}
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                className={fieldClass}
                style={fieldStyle}
                value={email}
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              className="mt-5 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? t("auth.forgotPassword.sending") : t("auth.forgotPassword.sendLink")}
            </button>

            {message && !isSuccess ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                {message}
              </p>
            ) : null}

            <p className="mt-4 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
              {t("auth.forgotPassword.rememberIt")}{" "}
              <Link className="font-semibold text-brand-600 no-underline hover:underline" to={`${prefix}/login`}>
                {t("auth.login.signIn")}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export const ResetPassword = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const response = await api.post<{ message: string }>("/auth/reset-password", {
        token: searchParams.get("token"),
        password
      });
      setMessage(response.data.message);
      setIsSuccess(true);
    } catch (error: unknown) {
      const apiError = error as AxiosError<{ message?: string }>;
      setMessage(apiError.response?.data?.message ?? "Failed to update password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 shadow-elevated">
            <span className="text-xl font-bold text-white">E</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("auth.resetPassword.title")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("auth.resetPassword.subtitle")}
          </p>
        </div>

        {isSuccess ? (
          <div
            className="rounded-2xl border p-6 text-center shadow-card"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
              ✓
            </div>
            <h2 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>{t("auth.resetPassword.updated")}</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>{message}</p>
            <Link
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white no-underline"
              to={`${prefix}/login`}
            >
              {t("auth.login.signIn")}
            </Link>
          </div>
        ) : (
          <form
            className="rounded-2xl border p-6 shadow-card"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            onSubmit={submit}
          >
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }} htmlFor="password">
                {t("common.newPassword")}
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                className={fieldClass}
                style={fieldStyle}
                value={password}
                placeholder="Min. 8 chars, 1 uppercase, 1 number"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              className="mt-5 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? t("auth.resetPassword.updating") : t("auth.resetPassword.update")}
            </button>

            {message && !isSuccess ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                {message}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
};
