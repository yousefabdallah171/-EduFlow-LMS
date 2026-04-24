import { useMemo, useState } from "react";
import { CheckCircle2, ShieldCheck, TriangleAlert } from "lucide-react";
import { Link, useSearchParams, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AxiosError } from "axios";

import { AuthShell } from "@/components/shared/AuthShell";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { resolveLocale } from "@/lib/locale";

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t, i18n } = useTranslation();
  const isAr = resolveLocale(i18n.language) === "ar";
  const token = searchParams.get("token");
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const copy = useMemo(
    () => ({
      missingToken: isAr ? "رابط إعادة التعيين مفقود أو لم يعد صالحا." : "The reset link is missing or no longer valid.",
      requestNewLink: isAr ? "اطلب رابط استعادة جديد" : "Request a new reset link",
      passwordTooShort: isAr ? "استخدم 8 أحرف على الأقل" : "Password must be at least 8 characters",
      passwordNeedsUppercase: isAr ? "أضف حرفا كبيرا واحدا على الأقل" : "Password must contain at least one uppercase letter",
      passwordNeedsNumber: isAr ? "أضف رقما واحدا على الأقل" : "Password must contain at least one number",
      passwordsDoNotMatch: isAr ? "كلمتا المرور غير متطابقتين" : "Passwords do not match",
      resetFailed: isAr ? "تعذر تحديث كلمة المرور الآن." : "Failed to reset password.",
      confirmPassword: isAr ? "تأكيد كلمة المرور الجديدة" : "Confirm new password",
      confirmPasswordPlaceholder: isAr ? "أعد كتابة كلمة المرور الجديدة" : "Re-enter your new password",
      successBody: isAr
        ? "تم حفظ كلمة المرور الجديدة بنجاح. يمكنك الآن العودة وتسجيل الدخول من جديد."
        : "Your new password has been saved. You can return to login and continue from there."
    }),
    [isAr]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (!token) {
      return;
    }

    if (form.newPassword.length < 8) {
      setMessage(copy.passwordTooShort);
      return;
    }
    if (!/[A-Z]/.test(form.newPassword)) {
      setMessage(copy.passwordNeedsUppercase);
      return;
    }
    if (!/[0-9]/.test(form.newPassword)) {
      setMessage(copy.passwordNeedsNumber);
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setMessage(copy.passwordsDoNotMatch);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post<{ message?: string }>("/auth/reset-password", { token, password: form.newPassword });
      setMessage(response.data.message ?? copy.successBody);
      setIsSuccess(true);
    } catch (e: unknown) {
      const err = e as AxiosError<{ message?: string; fields?: Record<string, string> }>;
      const fallback = err.response?.data?.fields ? Object.values(err.response.data.fields)[0] : undefined;
      setMessage(err.response?.data?.message ?? fallback ?? copy.resetFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      badge={isAr ? "تأمين الحساب" : "Secure your account"}
      title={t("auth.resetPassword.title")}
      subtitle={t("auth.resetPassword.subtitle")}
      highlights={[
        {
          title: isAr ? "متطلبات واضحة" : "Clear password rules",
          description: isAr
            ? "سترى الشروط المطلوبة بوضوح قبل تحديث كلمة المرور حتى لا تضطر للتخمين."
            : "The password requirements are visible up front so the update feels predictable."
        },
        {
          title: isAr ? "استعادة الوصول بسرعة" : "Fast recovery",
          description: isAr
            ? "إذا كان الرابط صالحا فستنتهي العملية خلال خطوة واحدة فقط."
            : "If the reset link is valid, this should be a single-step recovery flow."
        },
        {
          title: isAr ? "عودة آمنة إلى التعلم" : "Safe return to learning",
          description: isAr
            ? "بعد الحفظ يمكنك تسجيل الدخول من جديد ومتابعة نفس الحساب والمسار."
            : "Once saved, you can sign back in and continue with the same account and course access."
        }
      ]}
      aside={
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-brand-600" />
          <p className="text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
            {isAr
              ? "يفضل استخدام كلمة مرور جديدة لم تستخدمها سابقا في حسابات أخرى."
              : "For a safer reset, use a password you have not used for another account before."}
          </p>
        </div>
      }
      footer={
        token ? (
          <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            <Link className="font-semibold text-brand-600 no-underline hover:underline" to={`${prefix}/login`}>
              {t("auth.login.signIn")}
            </Link>
          </p>
        ) : (
          <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            <Link className="font-semibold text-brand-600 no-underline hover:underline" to={`${prefix}/forgot-password`}>
              {copy.requestNewLink}
            </Link>
          </p>
        )
      }
    >
      {!token ? (
        <div className="content-stack gap-4 text-center">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              backgroundColor: "color-mix(in oklab, var(--color-brand) 12%, var(--color-surface))",
              border: "1px solid color-mix(in oklab, var(--color-brand) 22%, transparent)",
              color: "var(--color-brand-text)",
            }}
          >
            <TriangleAlert className="h-7 w-7" />
          </div>
          <div className="content-stack gap-2">
            <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              {t("auth.resetPassword.title")}
            </h2>
            <p className="text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
              {copy.missingToken}
            </p>
          </div>
        </div>
      ) : isSuccess ? (
        <div className="content-stack gap-5 text-center">
          <div
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
            style={{
              backgroundColor: "color-mix(in oklab, var(--color-brand) 12%, var(--color-surface))",
              border: "1px solid color-mix(in oklab, var(--color-brand) 22%, transparent)",
              color: "var(--color-brand-text)",
            }}
          >
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div className="content-stack gap-2">
            <h2 className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              {t("auth.resetPassword.updated")}
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
            {t("auth.login.signIn")}
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="content-stack gap-5">
          <div className="content-stack gap-4">
            <div>
              <label className="ui-field-label" htmlFor="newPassword">
                {t("common.newPassword")}
              </label>
              <Input
                id="newPassword"
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                placeholder={t("common.passwordPlaceholder")}
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
            </div>

            <div>
              <label className="ui-field-label" htmlFor="confirmPassword">
                {copy.confirmPassword}
              </label>
              <Input
                id="confirmPassword"
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                placeholder={copy.confirmPasswordPlaceholder}
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              />
            </div>
          </div>

          <div className="ui-feedback">
            <p>{t("auth.resetPassword.subtitle")}</p>
          </div>

          {message ? (
            <div className="ui-feedback ui-feedback--danger">
              <p>{message}</p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-60"
            style={{ background: "var(--gradient-brand)" }}
          >
            {loading ? t("auth.resetPassword.updating") : t("auth.resetPassword.update")}
          </button>
        </form>
      )}
    </AuthShell>
  );
};
