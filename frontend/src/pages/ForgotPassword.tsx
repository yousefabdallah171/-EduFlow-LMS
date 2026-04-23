import { type FormEvent, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";

import { AuthShell } from "@/components/shared/AuthShell";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

export const ForgotPassword = () => {
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
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
      setMessage(apiError.response?.data?.message ?? (isAr ? "تعذر إرسال رابط الاستعادة الآن." : "Failed to send reset link."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      badge={isAr ? "استعادة الوصول" : "Recover access"}
      title={t("auth.forgotPassword.title")}
      subtitle={t("auth.forgotPassword.subtitle")}
      highlights={[
        {
          title: isAr ? "خطوة سريعة" : "A quick step",
          description: isAr
            ? "اكتب بريدك فقط وسنرسل رابطا جديدا لإعادة الدخول إلى حسابك."
            : "Enter your email and we will send a fresh link so you can securely get back into your account."
        },
        {
          title: isAr ? "بدون فقدان التقدم" : "No lost progress",
          description: isAr
            ? "إعادة تعيين كلمة المرور لا تؤثر على اشتراكك أو ترتيبك داخل الدورة."
            : "Resetting your password does not interrupt your enrollment or lesson progress."
        },
        {
          title: isAr ? "رسالة واضحة لما بعد ذلك" : "Clear next steps",
          description: isAr
            ? "بعد إرسال الطلب ستعرف بالضبط أين تذهب وماذا تفعل بعد فتح البريد."
            : "Once submitted, the flow tells you exactly what to do next after opening your email."
        }
      ]}
      aside={
        <p className="text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
          {isAr
            ? "إذا لم تصلك الرسالة خلال دقائق، راجع مجلد الرسائل غير المرغوب فيها ثم أعد المحاولة."
            : "If the email does not arrive within a few minutes, check your spam folder and try again from here."}
        </p>
      }
      footer={
        <p className="text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
          {t("auth.forgotPassword.rememberIt")}{" "}
          <Link className="font-semibold text-brand-600 no-underline hover:underline" to={`${prefix}/login`}>
            {t("auth.login.signIn")}
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
              {t("auth.forgotPassword.checkEmail")}
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
        <form className="content-stack gap-5" onSubmit={submit}>
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
            {isSubmitting ? t("auth.forgotPassword.sending") : t("auth.forgotPassword.sendLink")}
          </button>
        </form>
      )}
    </AuthShell>
  );
};
