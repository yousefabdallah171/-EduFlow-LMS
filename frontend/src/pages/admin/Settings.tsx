import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AdminShell } from "@/components/layout/AdminShell";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";

type CourseSettings = { titleEn?: string; titleAr?: string; descriptionEn?: string; descriptionAr?: string };
type SystemSettings = { smtpHost?: string; smtpUser?: string; smtpPass?: string; paymobKey?: string };

export const AdminSettings = () => {
  const { t } = useTranslation();
  const [course, setCourse] = useState<CourseSettings>({});
  const [system, setSystem] = useState<SystemSettings>({});

  const { data: courseData, isLoading: courseLoading } = useQuery({
    queryKey: ["admin-settings-course"],
    queryFn: () => api.get<CourseSettings>("/admin/settings/course").then((r) => r.data)
  });
  const { data: systemData, isLoading: systemLoading } = useQuery({
    queryKey: ["admin-settings-system"],
    queryFn: () => api.get<SystemSettings>("/admin/settings/system").then((r) => r.data)
  });

  useEffect(() => { if (courseData) setCourse(courseData); }, [courseData]);
  useEffect(() => { if (systemData) setSystem(systemData); }, [systemData]);

  const courseMut = useMutation({
    mutationFn: () => api.patch("/admin/settings/course", course),
    onSuccess: () => toast.success(t("admin.settings.saved")),
    onError: () => toast.error("Failed to save")
  });
  const systemMut = useMutation({
    mutationFn: () => api.patch("/admin/settings/system", system),
    onSuccess: () => toast.success(t("admin.settings.saved")),
    onError: () => toast.error("Failed to save")
  });

  return (
    <AdminShell title={t("admin.settings.title")} description={t("admin.settings.desc")}>
      {/* Course settings */}
      <div className="dashboard-panel p-6 space-y-4">
        <p className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{t("admin.settings.course")}</p>
        {courseLoading ? <div className="space-y-2">{Array.from({length:3}).map((_,i) => <Skeleton key={i} className="h-10" />)}</div> : (
          <>
            {[
              { label: "Title (EN)", field: "titleEn" as const },
              { label: "Title (AR)", field: "titleAr" as const },
              { label: "Description (EN)", field: "descriptionEn" as const },
              { label: "Description (AR)", field: "descriptionAr" as const },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className="mb-1 block text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{label}</label>
                {field.startsWith("description") ? (
                  <textarea rows={3} className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-brand-600" style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)", resize: "vertical" }} value={course[field] ?? ""} onChange={(e) => setCourse({ ...course, [field]: e.target.value })} />
                ) : (
                  <input className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-brand-600" style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }} value={course[field] ?? ""} onChange={(e) => setCourse({ ...course, [field]: e.target.value })} />
                )}
              </div>
            ))}
            <button onClick={() => void courseMut.mutateAsync()} disabled={courseMut.isPending} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-60" style={{ background: "var(--gradient-brand)" }} type="button">{courseMut.isPending ? "Saving..." : t("actions.save")}</button>
          </>
        )}
      </div>

      {/* System settings */}
      <div className="dashboard-panel p-6 space-y-4">
        <p className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{t("admin.settings.system")}</p>
        {systemLoading ? <div className="space-y-2">{Array.from({length:4}).map((_,i) => <Skeleton key={i} className="h-10" />)}</div> : (
          <>
            {[
              { label: "SMTP Host", field: "smtpHost" as const },
              { label: "SMTP User", field: "smtpUser" as const },
              { label: "SMTP Password (masked)", field: "smtpPass" as const },
              { label: "Paymob API Key (masked)", field: "paymobKey" as const },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className="mb-1 block text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{label}</label>
                <input type={field.includes("Pass") || field.includes("Key") ? "password" : "text"} className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:border-brand-600" style={{ backgroundColor: "var(--color-page)", borderColor: "var(--color-border-strong)", color: "var(--color-text-primary)" }} value={system[field] ?? ""} onChange={(e) => setSystem({ ...system, [field]: e.target.value })} placeholder={field.includes("Pass") || field.includes("Key") ? "••••••••••" : ""} />
              </div>
            ))}
            <button onClick={() => void systemMut.mutateAsync()} disabled={systemMut.isPending} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-60" style={{ background: "var(--gradient-brand)" }} type="button">{systemMut.isPending ? "Saving..." : t("actions.save")}</button>
          </>
        )}
      </div>
    </AdminShell>
  );
};
