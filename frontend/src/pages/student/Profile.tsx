import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { StudentShell } from "@/components/layout/StudentShell";
import { api } from "@/lib/api";

type ProfileData = { id: string; email: string; fullName: string; avatarUrl: string | null; role: string; emailVerified: boolean };

export const StudentProfile = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState({ fullName: "", avatarUrl: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
  const [imageError, setImageError] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["student-profile"],
    queryFn: () => api.get<ProfileData>("/student/profile").then((r) => r.data)
  });

  useEffect(() => {
    if (data) setProfile({ fullName: data.fullName, avatarUrl: data.avatarUrl ?? "" });
  }, [data]);

  const profileMut = useMutation({
    mutationFn: () => api.patch("/student/profile", { fullName: profile.fullName, avatarUrl: profile.avatarUrl || null }),
    onSuccess: () => { setImageError(false); toast.success(t("student.profile.saved")); },
    onError: () => toast.error(t("student.profile.failedSave"))
  });

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "Password must be at least 8 characters";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter";
    if (!/[0-9]/.test(pwd)) return "Password must contain at least one number";
    return null;
  };

  const passwordMut = useMutation({
    mutationFn: () => api.patch("/student/profile/password", { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
    onSuccess: () => { toast.success(t("auth.resetPassword.updated")); setPasswords({ currentPassword: "", newPassword: "", confirmNewPassword: "" }); },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string; fields?: Record<string, string> } } };
      const errorMsg = error.response?.data?.message || (error.response?.data?.fields ? Object.values(error.response.data.fields)[0] : t("student.profile.failedPassword"));
      toast.error(errorMsg);
    }
  });

  const initials = data?.fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const avatarUrl = profile.avatarUrl?.trim() && !imageError ? profile.avatarUrl : null;

  return (
    <StudentShell>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');

        .profile-container { font-family: 'Outfit', sans-serif; }
        .avatar-preview {
          width: 120px;
          height: 120px;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          font-weight: 700;
          color: white;
          position: relative;
          background: linear-gradient(135deg, #eb2027 0%, #c4191f 100%);
          box-shadow: 0 8px 24px rgba(235, 32, 39, 0.2);
          transition: all 0.3s ease;
          border: 3px solid var(--color-surface);
        }
        .avatar-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .avatar-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #eb2027;
          margin-bottom: 8px;
        }
        .profile-field {
          position: relative;
        }
        .profile-field label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .profile-field input {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid var(--color-border-strong);
          border-radius: 12px;
          font-size: 14px;
          transition: all 0.2s ease;
          background-color: var(--color-page);
          color: var(--color-text-primary);
        }
        .profile-field input:focus {
          outline: none;
          border-color: #eb2027;
          box-shadow: 0 0 0 3px rgba(235, 32, 39, 0.1);
        }
        .btn-save {
          background: linear-gradient(135deg, #eb2027 0%, #c4191f 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .btn-save:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(235, 32, 39, 0.3);
        }
        .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .section-card {
          border-radius: 16px;
          border: 1px solid var(--color-border);
          background-color: var(--color-surface);
          padding: 28px;
          animation: fadeInUp 0.4s ease-out;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .section-card:nth-child(2) { animation-delay: 0.1s; }
        .section-card:nth-child(3) { animation-delay: 0.2s; }
        .section-title {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #eb2027;
          margin-bottom: 20px;
        }
        .security-section { margin-top: 32px; }
        .password-field { margin-bottom: 16px; }
      `}</style>

      <div className="profile-container space-y-6">
        <header className="section-card">
          <p className="avatar-label">{t("student.shell.section")}</p>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {t("student.profile.title")}
          </h1>
        </header>

        {/* Profile Card */}
        <div className="section-card">
          <div className="section-title">{t("student.profile.info")}</div>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Avatar Preview and Input */}
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <div className="avatar-preview">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={data?.fullName}
                        onError={() => setImageError(true)}
                        onLoad={() => setImageError(false)}
                      />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <p className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
                      {data?.fullName}
                    </p>
                    <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                      {data?.email}
                    </p>
                    {data?.emailVerified && (
                      <p className="text-xs font-semibold text-green-600">✓ Verified</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4 pt-4 border-t" style={{ borderColor: "var(--color-border)" }}>
                <div className="profile-field">
                  <label style={{ color: "var(--color-text-primary)" }}>Full Name</label>
                  <input
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>

                <div className="profile-field">
                  <label style={{ color: "var(--color-text-primary)" }}>Avatar URL</label>
                  <input
                    value={profile.avatarUrl}
                    onChange={(e) => { setImageError(false); setProfile({ ...profile, avatarUrl: e.target.value }); }}
                    placeholder="https://example.com/avatar.jpg"
                    type="url"
                  />
                  <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
                    Enter an image URL to customize your avatar
                  </p>
                </div>

                <button
                  onClick={() => void profileMut.mutateAsync()}
                  disabled={profileMut.isPending}
                  className="btn-save w-full sm:w-auto"
                  type="button"
                >
                  {profileMut.isPending ? t("student.profile.saving") : t("actions.save")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Security Card */}
        <div className="section-card security-section">
          <div className="section-title">{t("student.profile.security")}</div>
          <div className="space-y-4">
            <div className="password-field">
              <label style={{ color: "var(--color-text-primary)" }} className="block text-xs font-bold uppercase tracking-wider mb-2">
                {t("student.profile.currentPassword")}
              </label>
              <input
                type="password"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:ring-opacity-10"
                style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-page)", color: "var(--color-text-primary)" }}
                value={passwords.currentPassword}
                onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              />
            </div>

            <div className="password-field">
              <label style={{ color: "var(--color-text-primary)" }} className="block text-xs font-bold uppercase tracking-wider mb-2">
                {t("common.newPassword")}
              </label>
              <input
                type="password"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:ring-opacity-10"
                style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-page)", color: "var(--color-text-primary)" }}
                value={passwords.newPassword}
                onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              />
            </div>

            <div className="password-field">
              <label style={{ color: "var(--color-text-primary)" }} className="block text-xs font-bold uppercase tracking-wider mb-2">
                {t("student.profile.confirmPassword")}
              </label>
              <input
                type="password"
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600 focus:ring-opacity-10"
                style={{ borderColor: "var(--color-border-strong)", backgroundColor: "var(--color-page)", color: "var(--color-text-primary)" }}
                value={passwords.confirmNewPassword}
                onChange={(e) => setPasswords({ ...passwords, confirmNewPassword: e.target.value })}
              />
            </div>

            <button
              onClick={() => {
                if (!passwords.currentPassword) { toast.error("Current password is required"); return; }
                const pwdError = validatePassword(passwords.newPassword);
                if (pwdError) { toast.error(pwdError); return; }
                if (passwords.newPassword !== passwords.confirmNewPassword) { toast.error(t("student.profile.passwordMismatch")); return; }
                void passwordMut.mutateAsync();
              }}
              disabled={passwordMut.isPending}
              className="btn-save w-full sm:w-auto"
              type="button"
            >
              {passwordMut.isPending ? t("student.profile.updating") : t("actions.updatePassword")}
            </button>
          </div>
        </div>
      </div>
    </StudentShell>
  );
};
