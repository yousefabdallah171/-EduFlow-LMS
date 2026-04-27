import { type FormEvent, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { useTranslation } from "react-i18next";

import { AuthShell } from "@/components/shared/AuthShell";
import { SEO } from "@/components/shared/SEO";
import { SEO_PAGES } from "@/lib/seo-config";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

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
      setMessage(apiError.response?.data?.message ?? t("auth.forgotPassword.errorSendLink"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <SEO page={SEO_PAGES.forgotPassword} />
    <AuthShell
      badge={t("auth.forgotPassword.badge")}
      title={t("auth.forgotPassword.title")}
      subtitle={t("auth.forgotPassword.subtitle")}
      highlights={[
        {
          title: t("auth.forgotPassword.highlights.quick.title"),
          description: t("auth.forgotPassword.highlights.quick.body")
        },
        {
          title: t("auth.forgotPassword.highlights.noLost.title"),
          description: t("auth.forgotPassword.highlights.noLost.body")
        },
        {
          title: t("auth.forgotPassword.highlights.nextSteps.title"),
          description: t("auth.forgotPassword.highlights.nextSteps.body")
        }
      ]}
      aside={
        <p className="text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
          {t("auth.forgotPassword.asideHint")}
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
    </>
  );
};
