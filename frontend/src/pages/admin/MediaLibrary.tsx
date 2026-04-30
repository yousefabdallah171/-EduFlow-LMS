import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
  const qc = useQueryClient();
  const [isMigrating, setIsMigrating] = useState(false);

  const summaryQuery = useQuery({
    queryKey: ["admin-media-library-summary"],
    queryFn: async () => {
      const response = await api.get<MediaStatusSummary>("/admin/media-library/status-summary");
      return response.data;
    }
  });

  const legacyQuery = useQuery({
    queryKey: ["admin-media-legacy-count"],
    queryFn: async () => {
      const response = await api.get<{ count: number }>("/admin/media-library/legacy-count");
      return response.data;
    }
  });

  const handleMigrate = async () => {
    setIsMigrating(true);
    try {
      const response = await api.post<{ migrated: number }>("/admin/media-library/backfill-legacy");
      const { migrated } = response.data;
      toast.success(
        migrated > 0
          ? `${migrated} video${migrated === 1 ? "" : "s"} migrated to the Media Library.`
          : "Nothing to migrate — all videos are already in the library."
      );
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-media-library-summary"] }),
        qc.invalidateQueries({ queryKey: ["admin-media-library"] }),
        qc.invalidateQueries({ queryKey: ["admin-media-legacy-count"] })
      ]);
    } catch {
      toast.error("Migration failed. Please try again.");
    } finally {
      setIsMigrating(false);
    }
  };

  const summary = summaryQuery.data ?? {
    uploading: 0,
    processing: 0,
    ready: 0,
    failed: 0,
    total: 0
  };

  const legacyCount = legacyQuery.data?.count ?? 0;

  return (
    <AdminShell
      title={isAr ? "مكتبة الوسائط" : "Media Library"}
      description={isAr ? "إدارة الوسائط ورفع الملفات بالجملة" : "Manage media assets and bulk uploads"}
    >
      <section className="space-y-5">
        {/* Legacy migration banner */}
        {legacyCount > 0 && (
          <div
            className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3"
            style={{
              borderColor: "var(--color-warning, #f59e0b)",
              backgroundColor: "var(--color-warning-bg, #fffbeb)"
            }}
          >
            <p className="text-sm">
              <strong>{legacyCount} existing video{legacyCount === 1 ? "" : "s"}</strong>{" "}
              {isAr
                ? "مرتبطة بالدروس ولكنها غير مرئية هنا. انقر على «ترحيل» لإضافتها إلى المكتبة."
                : "are attached to lessons but not visible in this library. Click Migrate to add them."}
            </p>
            <button
              className="shrink-0 rounded-lg border px-4 py-2 text-sm font-semibold"
              onClick={handleMigrate}
              disabled={isMigrating}
            >
              {isMigrating ? (isAr ? "جاري الترحيل…" : "Migrating…") : (isAr ? "ترحيل" : "Migrate Now")}
            </button>
          </div>
        )}

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
