import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { z } from "zod";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

const registerSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100, "Full name is too long"),
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .regex(/[A-Z]/, "Include at least one uppercase letter")
    .regex(/[0-9]/, "Include at least one number")
});

type FieldErrors = Partial<Record<"fullName" | "email" | "password", string>>;

export const Register = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t } = useTranslation();
  const [values, setValues] = useState({ fullName: "", email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsSuccess(false);

    const parsed = registerSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])) as FieldErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      const response = await api.post<{ message: string }>("/auth/register", parsed.data);
      setMessage(response.data.message);
      setIsSuccess(true);
    } catch (error: unknown) {
      const apiError = error as AxiosError<{ message?: string }>;
      setMessage(apiError.response?.data?.message ?? "Registration failed. Please try again.");
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
    <div className="flex min-h-dvh items-center justify-center px-6 py-12" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 shadow-elevated">
            <span className="text-xl font-bold text-white">E</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("auth.register.title")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
            {t("auth.register.subtitle")}
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
            <h2 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>{t("auth.register.checkEmail")}</h2>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>{message}</p>
            <Link
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white no-underline"
              to={`${prefix}/login`}
            >
              {t("auth.register.goToLogin")}
            </Link>
          </div>
        ) : (
          <form
            className="rounded-2xl border p-6 shadow-card"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            onSubmit={submit}
          >
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }} htmlFor="fullName">
                  {t("common.fullName")}
                </label>
                <Input
                  id="fullName"
                  autoComplete="name"
                  className={fieldClass}
                  style={fieldStyle}
                  value={values.fullName}
                  placeholder="Your name"
                  onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
                  aria-describedby={errors.fullName ? "fullName-error" : undefined}
                />
                {errors.fullName ? <p id="fullName-error" className="mt-1 text-xs text-red-500">{errors.fullName}</p> : null}
              </div>

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
                  value={values.email}
                  placeholder="you@example.com"
                  onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email ? <p id="email-error" className="mt-1 text-xs text-red-500">{errors.email}</p> : null}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }} htmlFor="password">
                  {t("common.password")}
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className={fieldClass}
                  style={fieldStyle}
                  value={values.password}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
                  aria-describedby={errors.password ? "password-error" : undefined}
                />
                {errors.password ? <p id="password-error" className="mt-1 text-xs text-red-500">{errors.password}</p> : null}
              </div>
            </div>

            <button
              className="mt-5 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow disabled:opacity-50"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? t("auth.register.creatingAccount") : t("auth.register.createAccount")}
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
              {t("auth.register.continueWithGoogle")}
            </a>

            {message && !isSuccess ? (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                {message}
              </p>
            ) : null}

            <p className="mt-4 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
              {t("auth.register.alreadyHaveAccount")}{" "}
              <Link className="font-semibold text-brand-600 no-underline hover:underline" to={`${prefix}/login`}>
                {t("auth.register.logIn")}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
