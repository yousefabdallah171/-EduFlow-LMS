import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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

type SystemSettings = {
  smtpHost?: string;
  smtpUser?: string;
  smtpPass?: string;
  paymobKey?: string;
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
  const [system, setSystem] = useState<SystemSettings>({});

  const { data: courseData, isLoading: courseLoading } = useQuery({
    queryKey: ["admin-settings-course"],
    queryFn: () => api.get<CourseSettings>("/admin/settings/course").then((response) => response.data)
  });

  const { data: systemData, isLoading: systemLoading } = useQuery({
    queryKey: ["admin-settings-system"],
    queryFn: () => api.get<SystemSettings>("/admin/settings/system").then((response) => response.data)
  });

  useEffect(() => {
    if (courseData) setCourse(courseData);
  }, [courseData]);

  useEffect(() => {
    if (systemData) setSystem(systemData);
  }, [systemData]);

  const courseMutation = useMutation({
    mutationFn: () => api.patch("/admin/settings/course", course),
    onSuccess: () => toast.success(t("admin.settings.saved")),
    onError: () => toast.error(isAr ? "تعذر حفظ إعدادات الدورة." : "Failed to save course settings.")
  });

  const systemMutation = useMutation({
    mutationFn: () => api.patch("/admin/settings/system", system),
    onSuccess: () => toast.success(t("admin.settings.saved")),
    onError: () => toast.error(isAr ? "تعذر حفظ إعدادات النظام." : "Failed to save system settings.")
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
                        style={{ ...fieldStyle, resize: "vertical" }}
                        value={course[field] ?? ""}
                        onChange={(event) => setCourse({ ...course, [field]: event.target.value })}
                      />
                    ) : (
                      <input
                        className={fieldClass}
                        style={fieldStyle}
                        value={course[field] ?? ""}
                        onChange={(event) => setCourse({ ...course, [field]: event.target.value })}
                      />
                    )}
                  </div>
                ))}

                <button
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-60"
                  style={{ background: "var(--gradient-brand)" }}
                  disabled={courseMutation.isPending}
                  onClick={() => void courseMutation.mutateAsync()}
                  type="button"
                >
                  {courseMutation.isPending ? copy.settings.saving : t("actions.save")}
                </button>
              </>
            )}
          </div>

          <div className="space-y-5">
            <div className="dashboard-panel p-6 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                  {copy.settings.emailDelivery}
                </p>
                <h3 className="mt-2 text-xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                  {copy.settings.smtpConfig}
                </h3>
              </div>

              {systemLoading ? (
                <div className="space-y-3">{Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-xl" />)}</div>
              ) : (
                <>
                  {[
                    { label: copy.settings.smtpHost, field: "smtpHost" as const, type: "text" },
                    { label: copy.settings.smtpUser, field: "smtpUser" as const, type: "text" }
                  ].map(({ label, field, type }) => (
                    <div key={field}>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                        {label}
                      </label>
                      <input
                        type={type}
                        className={fieldClass}
                        style={fieldStyle}
                        value={system[field] ?? ""}
                        onChange={(event) => setSystem({ ...system, [field]: event.target.value })}
                      />
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="dashboard-panel p-6 space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                  {copy.settings.sensitiveCredentials}
                </p>
                <h3 className="mt-2 text-xl font-black tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                  {copy.settings.secretKeys}
                </h3>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--color-text-secondary)" }}>
                  {copy.settings.secretDesc}
                </p>
              </div>

              {systemLoading ? (
                <div className="space-y-3">{Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-12 rounded-xl" />)}</div>
              ) : (
                <>
                  {[
                    { label: copy.settings.smtpPassword, field: "smtpPass" as const },
                    { label: copy.settings.paymobKey, field: "paymobKey" as const }
                  ].map(({ label, field }) => (
                    <div key={field}>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "var(--color-text-muted)" }}>
                        {label}
                      </label>
                      <input
                        type="password"
                        className={fieldClass}
                        placeholder="••••••••••"
                        style={fieldStyle}
                        value={system[field] ?? ""}
                        onChange={(event) => setSystem({ ...system, [field]: event.target.value })}
                      />
                    </div>
                  ))}

                  <button
                    className="rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-95 disabled:opacity-60"
                    style={{ background: "var(--gradient-brand)" }}
                    disabled={systemMutation.isPending}
                    onClick={() => void systemMutation.mutateAsync()}
                    type="button"
                  >
                    {systemMutation.isPending ? copy.settings.saving : t("actions.save")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </AdminShell>
  );
};
