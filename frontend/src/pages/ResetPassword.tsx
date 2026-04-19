import { useState } from "react";
import { Link, useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const { t } = useTranslation();
  const token = searchParams.get("token");
  const [form, setForm] = useState({ newPassword: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one number";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Reset link is missing or invalid.");
      return;
    }

    const pwdError = validatePassword(form.newPassword);
    if (pwdError) { toast.error(pwdError); return; }
    if (form.newPassword !== form.confirmPassword) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password: form.newPassword });
      toast.success(t("auth.resetPassword.updated"));
      void navigate(`${prefix}/login`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; fields?: Record<string, string> } } };
      const data = err.response?.data;
      const errorMsg = data?.message || (data?.fields ? Object.values(data.fields)[0] : "Failed to reset password");
      toast.error(errorMsg);
    } finally { setLoading(false); }
  };

  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-6 py-12" style={{ backgroundColor: "var(--color-page)" }}>
        <div className="w-full max-w-md">
          <div
            className="rounded-[28px] border p-8 text-center shadow-card"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              {t("auth.resetPassword.title")}
            </h1>
            <p className="mt-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Reset link is missing or invalid.
            </p>
            <Link className="mt-5 inline-block text-sm text-brand-600 no-underline hover:underline" to={`${prefix}/forgot-password`}>
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12" style={{ backgroundColor: "var(--color-page)" }}>
      <div className="w-full max-w-md">
        <div
          className="rounded-[28px] border p-8 shadow-card"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
        >
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("auth.resetPassword.title")}
          </h1>
          <p className="mt-1.5 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {t("auth.resetPassword.subtitle")}
          </p>

          <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
            {[
              { label: t("common.newPassword"), field: "newPassword" as const },
              { label: "Confirm new password", field: "confirmPassword" as const },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{label}</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-brand-600"
                  style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }}
                  placeholder={t("common.passwordPlaceholder")}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-60"
              style={{ background: "var(--gradient-brand)" }}
            >
              {loading ? t("auth.resetPassword.updating") : t("auth.resetPassword.update")}
            </button>
          </form>

          <p className="mt-5 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            <Link className="text-brand-600 no-underline hover:underline" to={`${prefix}/login`}>
              {t("auth.forgotPassword.rememberIt")} {t("auth.login.signIn")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
