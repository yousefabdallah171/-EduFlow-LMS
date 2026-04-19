import { type FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const nextUser = await login(email, password);
      navigate(nextUser.role === "ADMIN" ? `${prefix}/admin/dashboard` : `${prefix}/dashboard`, { replace: true });
    } catch (error: unknown) {
      const apiError = error as AxiosError<{ message?: string }>;
      setMessage(apiError.response?.data?.message ?? "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = "mt-1.5 block w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all placeholder:opacity-40 focus:ring-2 focus:ring-brand-600/30";
  const fieldStyle = {
    backgroundColor: "var(--color-surface-2)",
    borderColor: "var(--color-border-strong)",
    color: "var(--color-text-primary)"
  };

  return (
    <div className="dashboard-page flex min-h-dvh items-center justify-center px-6 py-12" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[20px] shadow-elevated" style={{ background: "var(--gradient-brand)" }}>
            <span className="text-xl font-bold text-white">E</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("auth.login.title")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("auth.login.subtitle")}
          </p>
        </div>

        <form className="dashboard-panel dashboard-panel--strong p-6" onSubmit={submit}>
          <div className="space-y-4">
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

            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }} htmlFor="password">
                  {t("common.password")}
                </label>
                <Link className="text-xs font-medium text-brand-600 no-underline hover:underline" to={`${prefix}/forgot-password`}>
                  {t("auth.login.forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                className={fieldClass}
                style={fieldStyle}
                value={password}
                placeholder="Your password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            className="mt-5 w-full rounded-xl py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 hover:shadow disabled:opacity-50"
            style={{ background: "var(--gradient-brand)" }}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? t("auth.login.signingIn") : t("auth.login.signIn")}
          </button>

          <div className="relative my-4 flex items-center gap-3">
            <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border-strong)" }} />
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{t("common.or")}</span>
            <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border-strong)" }} />
          </div>

          <a
            className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium no-underline transition-colors hover:bg-surface2"
            style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
            href="/api/v1/auth/oauth/google"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t("auth.login.continueWithGoogle")}
          </a>

          {message ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {message}
            </p>
          ) : null}

          <p className="mt-4 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
            {t("auth.login.noAccount")}{" "}
            <Link className="font-semibold text-brand-600 no-underline hover:underline" to={`${prefix}/register`}>
              {t("auth.login.signUpFree")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
