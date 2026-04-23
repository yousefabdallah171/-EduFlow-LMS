import { type FormEvent, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { z } from "zod";
import { useTranslation } from "react-i18next";

import { AuthShell } from "@/components/shared/AuthShell";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

type FieldErrors = Partial<Record<"fullName" | "email" | "password", string>>;

export const Register = () => {
  const { isAuthReady, user } = useAuthStore();
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [values, setValues] = useState({ fullName: "", email: "", password: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registerSchema = useMemo(
    () =>
      z.object({
        fullName: z
          .string()
          .trim()
          .min(1, isAr ? "الاسم الكامل مطلوب" : "Full name is required")
          .max(100, isAr ? "الاسم الكامل طويل جدا" : "Full name is too long"),
        email: z.string().email(isAr ? "أدخل بريدا إلكترونيا صحيحا" : "Enter a valid email"),
        password: z
          .string()
          .min(8, isAr ? "استخدم 8 أحرف على الأقل" : "Use at least 8 characters")
          .regex(/[A-Z]/, isAr ? "أضف حرفا كبيرا واحدا على الأقل" : "Include at least one uppercase letter")
          .regex(/[0-9]/, isAr ? "أضف رقما واحدا على الأقل" : "Include at least one number")
      }),
    [isAr]
  );

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
      setMessage(apiError.response?.data?.message ?? (isAr ? "تعذر إنشاء الحساب الآن. حاول مرة أخرى." : "Registration failed. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthReady && user) {
    const target = user.role === "ADMIN" ? `${prefix}/admin/dashboard` : `${prefix}/profile`;
    return <Navigate replace to={target} />;
  }

  return (
    <AuthShell
      badge={isAr ? "ابدأ رحلتك" : "Start your journey"}
      title={t("auth.register.title")}
      subtitle={t("auth.register.subtitle")}
      highlights={[
        {
          title: isAr ? "وصول فوري بعد التفعيل" : "Immediate access after activation",
          description: isAr
            ? "بمجرد تأكيد البريد وفتح الاشتراك ستنتقل مباشرة إلى الدروس والمسار الكامل."
            : "Once your email is verified and access is active, you can move straight into the full lesson library."
        },
        {
          title: isAr ? "تجربة عربية وإنجليزية" : "Arabic and English ready",
          description: isAr
            ? "الواجهة والتدفق ورسائل الاستخدام مصممة لتبقى واضحة في اللغتين."
            : "The experience is tuned to stay clear and comfortable in both Arabic and English."
        },
        {
          title: isAr ? "مشاهدة محمية" : "Protected learning access",
          description: isAr
            ? "الدخول مرتبط بجلسة المستخدم حتى تبقى تجربة التعلم والدفع والدخول متسقة وآمنة."
            : "Session-aware access keeps sign-in, checkout, and lesson playback aligned and secure."
        }
      ]}
      aside={
        <div className="content-stack gap-2">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {isAr ? "هذه بداية بسيطة وليست خطوة ثقيلة." : "This should feel simple, not like paperwork."}
          </p>
          <p className="text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
            {isAr
              ? "أنشئ حسابك مرة واحدة لتتمكن من متابعة المعاينة والدفع والوصول إلى الدورة من نفس المكان."
              : "Create one account to manage your preview, payment, and full-course access from the same place."}
          </p>
        </div>
      }
      footer={
        <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          {t("auth.register.alreadyHaveAccount")}{" "}
          <Link className="font-semibold text-brand-600 no-underline hover:underline" to={`${prefix}/login`}>
            {t("auth.register.logIn")}
          </Link>
        </p>
      }
    >
      {isSuccess ? (
        <div className="content-stack gap-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="content-stack gap-2">
            <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              {t("auth.register.checkEmail")}
            </h2>
            <p className="text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
              {message}
            </p>
          </div>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white no-underline transition-all hover:opacity-95"
            style={{ background: "var(--gradient-brand)" }}
            to={`${prefix}/login`}
          >
            {t("auth.register.goToLogin")}
          </Link>
        </div>
      ) : (
        <form className="content-stack gap-5" onSubmit={submit}>
          <div className="content-stack gap-4">
            <div>
              <label className="ui-field-label" htmlFor="fullName">
                {t("common.fullName")}
              </label>
              <Input
                id="fullName"
                autoComplete="name"
                value={values.fullName}
                placeholder={isAr ? "اكتب اسمك الكامل" : "Enter your full name"}
                onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
              />
              {errors.fullName ? (
                <p id="fullName-error" className="mt-2 text-xs text-red-500">
                  {errors.fullName}
                </p>
              ) : null}
            </div>

            <div>
              <label className="ui-field-label" htmlFor="email">
                {t("common.email")}
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={values.email}
                placeholder="you@example.com"
                onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email ? (
                <p id="email-error" className="mt-2 text-xs text-red-500">
                  {errors.email}
                </p>
              ) : null}
            </div>

            <div>
              <label className="ui-field-label" htmlFor="password">
                {t("common.password")}
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                value={values.password}
                placeholder={t("common.passwordPlaceholder")}
                onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
                aria-describedby={errors.password ? "password-error" : "password-hint"}
              />
              <p id="password-hint" className="mt-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                {t("auth.resetPassword.subtitle")}
              </p>
              {errors.password ? (
                <p id="password-error" className="mt-2 text-xs text-red-500">
                  {errors.password}
                </p>
              ) : null}
            </div>
          </div>

          {message && !isSuccess ? (
            <div className="ui-feedback ui-feedback--danger">
              <p>{message}</p>
            </div>
          ) : null}

          <button
            className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
            style={{ background: "var(--gradient-brand)" }}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? t("auth.register.creatingAccount") : t("auth.register.createAccount")}
          </button>

          <div className="relative flex items-center gap-3">
            <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border-strong)" }} />
            <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {t("common.or")}
            </span>
            <div className="h-px flex-1" style={{ backgroundColor: "var(--color-border-strong)" }} />
          </div>

          <a
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium no-underline transition-colors hover:bg-surface2"
            style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
            href="/api/v1/auth/oauth/google"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {t("auth.register.continueWithGoogle")}
          </a>
        </form>
      )}
    </AuthShell>
  );
};
