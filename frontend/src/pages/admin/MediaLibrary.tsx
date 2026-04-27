import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { MediaLibraryTable } from "@/components/admin/media/MediaLibraryTable";
import { BatchSummaryCard } from "@/components/admin/uploader/BatchSummaryCard";
import { UploadDropzone } from "@/components/admin/uploader/UploadDropzone";
import { UploadRecoveryPanel } from "@/components/admin/uploader/UploadRecoveryPanel";
import { AdminShell } from "@/components/layout/AdminShell";
import { api } from "@/lib/api";
import { resolveLocale } from "@/lib/locale";

type MediaStatusSummary = {
  uploading: number;
  processing: number;
  ready: number;
  failed: number;
  total: number;
};

export const AdminMediaLibrary = () => {
  const { i18n } = useTranslation();
  const isAr = resolveLocale(i18n.language) === "ar";

  const summaryQuery = useQuery({
    queryKey: ["admin-media-library-summary"],
    queryFn: async () => {
      const response = await api.get<MediaStatusSummary>("/admin/media-library/status-summary");
      return response.data;
    }
  });

  const summary = summaryQuery.data ?? {
    uploading: 0,
    processing: 0,
    ready: 0,
    failed: 0,
    total: 0
  };

  return (
    <AdminShell
      title={isAr ? "مكتبة الوسائط" : "Media Library"}
      description={isAr ? "إدارة الوسائط ورفع الملفات بالجملة" : "Manage media assets and bulk uploads"}
    >
      <section className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: isAr ? "الإجمالي" : "Total", value: summary.total },
            { label: isAr ? "يتم الرفع" : "Uploading", value: summary.uploading },
            { label: isAr ? "المعالجة" : "Processing", value: summary.processing },
            { label: isAr ? "جاهز" : "Ready", value: summary.ready },
            { label: isAr ? "فشل" : "Failed", value: summary.failed }
          ].map((card) => (
            <article key={card.label} className="dashboard-panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--color-text-muted)" }}>
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-black" style={{ color: "var(--color-text-primary)" }}>
                {card.value}
              </p>
            </article>
          ))}
        </div>

        <UploadDropzone />
        <div className="grid gap-3 lg:grid-cols-2">
          <UploadRecoveryPanel />
          <BatchSummaryCard />
        </div>
        <MediaLibraryTable />
      </section>
    </AdminShell>
  );
};
