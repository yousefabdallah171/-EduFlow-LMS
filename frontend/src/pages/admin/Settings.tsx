import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";

import { AdminShell } from "@/components/layout/AdminShell";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminUiCopy } from "@/lib/admin-ui-copy";
import { api } from "@/lib/api";
import { resolveLocale } from "@/lib/locale";

type CourseSettings = {
  titleEn?: string;
  titleAr?: string;
  descriptionEn?: string;
  descriptionAr?: string;
};

type SystemStatus = {
  smtpConfigured: boolean;
  paymobConfigured: boolean;
  storageConfigured: boolean;
};

const validateCourseSettings = (settings: CourseSettings): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!settings.titleEn?.trim()) errors.titleEn = "English title is required";
  if (settings.titleEn && settings.titleEn.length > 200) errors.titleEn = "English title must be 200 characters or less";
  if (!settings.titleAr?.trim()) errors.titleAr = "Arabic title is required";
  if (settings.titleAr && settings.titleAr.length > 200) errors.titleAr = "Arabic title must be 200 characters or less";
  if (settings.descriptionEn && settings.descriptionEn.length > 5000) errors.descriptionEn = "English description must be 5000 characters or less";
  if (settings.descriptionAr && settings.descriptionAr.length > 5000) errors.descriptionAr = "Arabic description must be 5000 characters or less";
  return errors;
};

const fieldClass =
  "w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:border-brand-600";

const fieldStyle = {
  backgroundColor: "var(--color-page)",
  borderColor: "var(--color-border-strong)",
  color: "var(--color-text-primary)"
};

export const AdminSettings = () => {
  const { t, i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);
  const copy = getAdminUiCopy(locale);
  const isAr = locale === "ar";
  const [course, setCourse] = useState<CourseSettings>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const { data: courseData, isLoading: courseLoading } = useQuery({
    queryKey: ["admin-settings-course"],
    queryFn: () => api.get<CourseSettings>("/admin/settings/course").then((response) => response.data)
  });

  const { data: systemStatus, isLoading: systemLoading } = useQuery({
    queryKey: ["admin-settings-system"],
    queryFn: () => api.get<SystemStatus>("/admin/settings/system").then((response) => response.data)
  });

  useEffect(() => {
    if (courseData) setCourse(courseData);
  }, [courseData]);

  const courseMutation = useMutation({
    mutationFn: () => api.patch("/admin/settings/course", course),
    onSuccess: () => toast.success(t("admin.settings.saved")),
    onError: () => toast.error(isAr ? "تعذر حفظ إعدادات الدورة." : "Failed to save course settings.")
  });

  return (
    <AdminShell title={t("admin.settings.title")} description={t("admin.settings.desc")}>
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: copy.settings.courseCopy, value: copy.settings.courseCopyValue, note: copy.settings.courseCopyNote },
            { label: copy.settings.deliverySetup, value: copy.settings.deliverySetupValue, note: copy.settings.deliverySetupNote },
            { label: copy.settings.payments, value: copy.settings.paymentsValue, note: copy.settings.paymentsNote },
            { label: copy.settings.saveFlow, value: copy.settings.saveFlowValue, note: copy.settings.saveFlowNote }
          ].map((item) => (
            <div key={item.label} className="dashboard-panel p-5">
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {item.value}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                {item.note}
              </p>
            </div>
          ))}
        </div>

        <div className="dashboard-panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
            {copy.settings.guidance}
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            {copy.settings.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7" style={{ color: "var(--color-text-secondary)" }}>
            {copy.settings.desc}
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <div className="dashboard-panel p-6 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {copy.settings.courseSettings}
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {copy.settings.publicPresentation}
              </h3>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                {copy.settings.publicDesc}
              </p>
            </div>

            {courseLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-xl" />)}</div>
            ) : (
              <>
                {[
                  { label: copy.pricing.titleEn, field: "titleEn" as const, multiline: false },
                  { label: copy.pricing.titleAr, field: "titleAr" as const, multiline: false },
                  { label: copy.pricing.descriptionEn, field: "descriptionEn" as const, multiline: true },
                  { label: copy.pricing.descriptionAr, field: "descriptionAr" as const, multiline: true }
                ].map(({ label, field, multiline }) => (
                  <div key={field}>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                      {label}
                    </label>
                    {multiline ? (
                      <textarea
                        rows={4}
                        className={fieldClass}
                        style={{ ...fieldStyle, resize: "vertical", borderColor: validationErrors[field] ? "#ef4444" : "var(--color-border-strong)" }}
                        value={course[field] ?? ""}
                        onChange={(event) => setCourse({ ...course, [field]: event.target.value })}
                      />
                    ) : (
                      <input
                        className={fieldClass}
                        style={{ ...fieldStyle, borderColor: validationErrors[field] ? "#ef4444" : "var(--color-border-strong)" }}
                        value={course[field] ?? ""}
                        onChange={(event) => setCourse({ ...course, [field]: event.target.value })}
                      />
                    )}
                    {validationErrors[field] && (
                      <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: "#ef4444" }}>
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors[field]}
                      </div>
                    )}
                  </div>
                ))}

                <button
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-60"
                  style={{ background: "var(--gradient-brand)" }}
                  disabled={courseMutation.isPending}
                  onClick={() => {
                    const errors = validateCourseSettings(course);
                    if (Object.keys(errors).length > 0) {
                      setValidationErrors(errors);
                      return;
                    }
                    setValidationErrors({});
                    void courseMutation.mutateAsync();
                  }}
                  type="button"
                >
                  {courseMutation.isPending ? copy.settings.saving : t("actions.save")}
                </button>
              </>
            )}
          </div>

          <div className="dashboard-panel p-6 space-y-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                {copy.settings.emailDelivery}
              </p>
              <h3 className="mt-2 text-xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                {copy.settings.smtpConfig}
              </h3>
              <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                Configure email delivery via environment variables. No direct editing available in admin panel.
              </p>
            </div>

            {systemLoading ? (
              <div className="space-y-3">{Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-xl" />)}</div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border p-4" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex items-center justify-between">
                    <span style={{ color: "var(--color-text-primary)" }}>Email (SMTP)</span>
                    <span
                      className="inline-block rounded-full px-3 py-1 text-xs font-bold"
                      style={{
                        backgroundColor: systemStatus?.smtpConfigured ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: systemStatus?.smtpConfigured ? "#22c55e" : "#ef4444"
                      }}
                    >
                      {systemStatus?.smtpConfigured ? "✓ Configured" : "✗ Not Configured"}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border p-4" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex items-center justify-between">
                    <span style={{ color: "var(--color-text-primary)" }}>Payment Processing (Paymob)</span>
                    <span
                      className="inline-block rounded-full px-3 py-1 text-xs font-bold"
                      style={{
                        backgroundColor: systemStatus?.paymobConfigured ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: systemStatus?.paymobConfigured ? "#22c55e" : "#ef4444"
                      }}
                    >
                      {systemStatus?.paymobConfigured ? "✓ Configured" : "✗ Not Configured"}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg border p-4" style={{ borderColor: "var(--color-border)" }}>
                  <div className="flex items-center justify-between">
                    <span style={{ color: "var(--color-text-primary)" }}>Media Storage</span>
                    <span
                      className="inline-block rounded-full px-3 py-1 text-xs font-bold"
                      style={{
                        backgroundColor: systemStatus?.storageConfigured ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: systemStatus?.storageConfigured ? "#22c55e" : "#ef4444"
                      }}
                    >
                      {systemStatus?.storageConfigured ? "✓ Configured" : "✗ Not Configured"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </AdminShell>
  );
};
