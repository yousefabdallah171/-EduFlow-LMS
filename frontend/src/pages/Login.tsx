import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";

import { AuthShell } from "@/components/shared/AuthShell";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string>("");
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canResend = useMemo(() => errorCode === "EMAIL_NOT_VERIFIED" && email.trim().length > 3, [email, errorCode]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setResendMessage("");
    setErrorCode(null);
    try {
      const nextUser = await login(email, password);
      navigate(nextUser.role === "ADMIN" ? `${prefix}/admin/dashboard` : `${prefix}/dashboard`, { replace: true });
    } catch (error: unknown) {
      const apiError = error as AxiosError<{ message?: string; error?: string }>;
      const apiStatus = apiError.response?.status;
      const apiErrorCode = apiError.response?.data?.error ?? null;
      setErrorCode(apiErrorCode ?? (apiStatus === 403 ? "EMAIL_NOT_VERIFIED" : null));
      setMessage(apiError.response?.data?.message ?? (isAr ? "تعذر تسجيل الدخول. راجع بياناتك وحاول مرة أخرى." : "Login failed. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendVerification = async () => {
    if (!canResend) return;

    setIsResending(true);
    setResendMessage("");
    try {
      const response = await api.post<{ message: string }>("/auth/resend-verification", { email: email.trim() });
      setResendMessage(response.data.message);
    } catch (error: unknown) {
      const apiError = error as AxiosError<{ message?: string }>;
      setResendMessage(apiError.response?.data?.message ?? (isAr ? "تعذر إرسال الرابط الآن." : "Could not send the verification email right now."));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthShell
      badge={isAr ? "العودة إلى مسارك" : "Return to your workflow"}
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      highlights={[
        {
          title: isAr ? "أكمل من حيث توقفت" : "Continue where you left off",
          description: isAr
            ? "بعد تسجيل الدخول ستعود مباشرة إلى مسارك، سواء كنت طالبا أو داخل لوحة الإدارة."
            : "Sign in once and we can route you straight back into the student flow or admin workspace."
        },
        {
          title: isAr ? "نفس الحساب لكل شيء" : "One account for the whole journey",
          description: isAr
            ? "المعاينة والدفع والوصول الكامل للدروس كلها مرتبطة بنفس الحساب."
            : "Preview, checkout, and full lesson access all stay connected through the same account."
        },
        {
          title: isAr ? "دخول أكثر اطمئنانا" : "Safer session handling",
          description: isAr
            ? "ربط الجلسة بالمستخدم يساعد على إبقاء المحتوى والوصول والمدفوعات متناسقة."
            : "Session-aware access keeps lesson playback, account state, and payments aligned."
        }
      ]}
      aside={
        <div className="content-stack gap-2">
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {isAr ? "نسيت كلمة المرور؟" : "Forgot your password?"}
          </p>
          <p className="text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
            {isAr
              ? "يمكنك طلب رابط استعادة جديد والعودة بسرعة بدون فقدان وصولك للدورة."
              : "You can request a fresh reset link and get back into the course without losing your place."}
          </p>
        </div>
      }
      footer={
        <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          {t("auth.login.noAccount")}{" "}
          <Link className="font-semibold text-brand-600 no-underline hover:underline" to={`${prefix}/register`}>
            {t("auth.login.signUpFree")}
          </Link>
        </p>
      }
    >
      <form className="content-stack gap-5" onSubmit={submit}>
        <div className="content-stack gap-4">
          <div>
            <label className="ui-field-label" htmlFor="email">
              {t("common.email")}
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label className="ui-field-label mb-0" htmlFor="password">
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
              value={password}
              placeholder={isAr ? "اكتب كلمة المرور الخاصة بك" : "Enter your password"}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {message ? (
          <div className="ui-feedback ui-feedback--danger">
            <p>{message}</p>
            {canResend ? (
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  className="rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface2 disabled:opacity-50"
                  style={{ borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  onClick={() => void resendVerification()}
                  disabled={isResending}
                >
                  {isResending ? (isAr ? "جاري الإرسال…" : "Sending…") : (isAr ? "إعادة إرسال رابط التحقق" : "Resend verification email")}
                </button>
                {resendMessage ? (
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{resendMessage}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <button
          className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50"
          style={{ background: "var(--gradient-brand)" }}
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? t("auth.login.signingIn") : t("auth.login.signIn")}
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
          {t("auth.login.continueWithGoogle")}
        </a>
      </form>
    </AuthShell>
  );
};
