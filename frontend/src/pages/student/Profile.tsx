import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ImagePlus, KeyRound, Save, ShieldCheck, UserCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/PageHeader";
import { StudentShell } from "@/components/layout/StudentShell";
import { Avatar } from "@/components/Avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

type ProfileData = {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  emailVerified: boolean;
  oauthProvider: "email" | "google";
};

export const StudentProfile = () => {
  const { t } = useTranslation();
  const { locale } = useParams();
  const prefix = locale === "en" || locale === "ar" ? `/${locale}` : "";
  const [profile, setProfile] = useState({ fullName: "", avatarUrl: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["student-profile"],
    queryFn: () => api.get<ProfileData>("/student/profile").then((r) => r.data)
  });

  useEffect(() => {
    if (data) setProfile({ fullName: data.fullName, avatarUrl: data.avatarUrl ?? "" });
  }, [data]);

  const profileMut = useMutation({
    mutationFn: () => api.patch("/student/profile", { fullName: profile.fullName, avatarUrl: profile.avatarUrl || null }),
    onSuccess: () => {
      toast.success(t("student.profile.saved"));
    },
    onError: () => toast.error(t("student.profile.failedSave"))
  });

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return t("student.profile.passwordMinLength");
    if (!/[A-Z]/.test(pwd)) return t("student.profile.passwordUppercase");
    if (!/[0-9]/.test(pwd)) return t("student.profile.passwordNumber");
    return null;
  };

  const passwordMut = useMutation({
    mutationFn: () => api.patch("/student/profile/password", { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
    onSuccess: () => {
      toast.success(t("auth.resetPassword.updated"));
      setPasswords({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string; fields?: Record<string, string> } } };
      const errorMsg = error.response?.data?.message || (error.response?.data?.fields ? Object.values(error.response.data.fields)[0] : t("student.profile.failedPassword"));
      toast.error(errorMsg);
    }
  });

  const initials = data?.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const avatarUrl = profile.avatarUrl?.trim() ? profile.avatarUrl : null;

  return (
    <StudentShell>
      <div className="space-y-6">
        <PageHeader
          hero
          backHref={`${prefix}/dashboard`}
          backLabel={t("nav.dashboard")}
          eyebrow={t("student.shell.section")}
          title={t("student.profile.title")}
          description={t("student.profile.description")}
        />

        <section className="dashboard-panel p-6">
          <div className="mb-5 flex items-center gap-2 text-brand-600">
            <UserCircle2 className="h-4 w-4" />
            <h2 className="text-xs font-bold uppercase tracking-[0.16em]">{t("student.profile.info")}</h2>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-[24px]" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <div
                  className="flex h-28 w-28 flex-shrink-0 items-center justify-center overflow-hidden rounded-[24px] text-4xl font-bold text-white shadow-card"
                  style={{ background: "var(--gradient-brand)", border: "3px solid var(--color-surface)" }}
                >
                  <Avatar
                    alt={data?.fullName ?? t("student.profile.title")}
                    className="h-full w-full rounded-[24px] text-4xl font-bold text-white"
                    fallback={initials}
                    src={avatarUrl}
                    style={{ background: "var(--gradient-brand)" }}
                  />
                </div>

                <div className="min-w-0 flex-1 text-center sm:text-start">
                  <p className="font-display text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                    {data?.fullName}
                  </p>
                  <p className="mt-1 break-all text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {data?.email}
                  </p>
                  {data?.emailVerified ? (
                    <p
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: "color-mix(in oklab, var(--color-brand) 12%, var(--color-surface))",
                        border: "1px solid color-mix(in oklab, var(--color-brand) 22%, transparent)",
                        color: "var(--color-brand-text)",
                      }}
	                    >
	                      <Check className="h-3.5 w-3.5" />
	                      {t("student.profile.verified")}
	                    </p>
	                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 border-t pt-5 sm:grid-cols-2" style={{ borderColor: "var(--color-border)" }}>
                <label className="block">
                  <span className="ui-field-label">
                    {t("common.fullName")}
                  </span>
                  <input
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                    style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-page)", color: "var(--color-text-primary)" }}
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    placeholder={t("common.fullName")}
                  />
                </label>

                <label className="block">
                  <span className="ui-field-label flex items-center gap-1.5">
                    <ImagePlus className="h-3.5 w-3.5" />
                    {t("student.profile.avatarUrl")}
                  </span>
                  <input
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                    style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-page)", color: "var(--color-text-primary)" }}
                    value={profile.avatarUrl}
                    onChange={(e) => {
                      setProfile({ ...profile, avatarUrl: e.target.value });
                    }}
                    placeholder="https://example.com/avatar.jpg"
                    type="url"
                  />
                </label>
              </div>

              <button
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50 sm:w-auto"
                style={{ background: "var(--gradient-brand)" }}
                onClick={() => void profileMut.mutateAsync()}
                disabled={profileMut.isPending}
                type="button"
              >
                <Save className="h-4 w-4" />
                {profileMut.isPending ? t("student.profile.saving") : t("actions.save")}
              </button>
            </div>
          )}
        </section>

        <section className="dashboard-panel p-6">
          <div className="mb-5 flex items-center gap-2 text-brand-600">
            <ShieldCheck className="h-4 w-4" />
            <h2 className="text-xs font-bold uppercase tracking-[0.16em]">{t("student.profile.security")}</h2>
          </div>

          {data?.oauthProvider === "google" ? (
            <div className="ui-feedback">
              <p>
                {t("student.profile.googlePasswordDisabled")}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="ui-field-label">{t("student.profile.currentPassword")}</span>
                  <input
                    type="password"
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                    style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-page)", color: "var(--color-text-primary)" }}
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="ui-field-label">{t("common.newPassword")}</span>
                  <input
                    type="password"
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                    style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-page)", color: "var(--color-text-primary)" }}
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  />
                </label>

                <label className="block">
                  <span className="ui-field-label">{t("student.profile.confirmPassword")}</span>
                  <input
                    type="password"
                    className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:border-brand-600 focus:ring-2 focus:ring-brand-600/15"
                    style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-page)", color: "var(--color-text-primary)" }}
                    value={passwords.confirmNewPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmNewPassword: e.target.value })}
                  />
                </label>
              </div>

              <div className="mt-4 ui-feedback">
                <p>{t("auth.resetPassword.subtitle")}</p>
              </div>

              <button
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 disabled:opacity-50 sm:w-auto"
                style={{ background: "var(--gradient-brand)" }}
	                onClick={() => {
	                  if (!passwords.currentPassword) {
	                    toast.error(t("student.profile.currentPasswordRequired"));
	                    return;
	                  }
                  const pwdError = validatePassword(passwords.newPassword);
                  if (pwdError) {
                    toast.error(pwdError);
                    return;
                  }
                  if (passwords.newPassword !== passwords.confirmNewPassword) {
                    toast.error(t("student.profile.passwordMismatch"));
                    return;
                  }
                  void passwordMut.mutateAsync();
                }}
                disabled={passwordMut.isPending}
                type="button"
              >
                <KeyRound className="h-4 w-4" />
                {passwordMut.isPending ? t("student.profile.updating") : t("actions.updatePassword")}
              </button>
            </>
          )}
        </section>
      </div>
    </StudentShell>
  );
};
