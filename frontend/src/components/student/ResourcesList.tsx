import { Download, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Resource {
  id: string;
  title: string;
  fileUrl: string;
  fileSizeBytes: bigint | number;
  createdAt: string;
}

interface ResourcesListProps {
  resources: Resource[];
}

export const ResourcesList = ({ resources }: ResourcesListProps) => {
  const { t } = useTranslation();

  const formatFileSize = (bytes: number | bigint) => {
    const numBytes = typeof bytes === "bigint" ? Number(bytes) : bytes;
    if (numBytes < 1024) return `${numBytes} B`;
    if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
    if (numBytes < 1024 * 1024 * 1024) return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(numBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getFileExtension = (filename: string) => {
    return filename.split(".").pop()?.toLowerCase() || "file";
  };

  if (resources.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 space-y-4 border-t pt-8" style={{ borderColor: "var(--color-border)" }}>
      <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {t("lesson.courseMaterials") || "Course Materials"}
      </h3>

      <div className="space-y-2">
        {resources.map((resource) => (
          <a
            key={resource.id}
            href={resource.fileUrl}
            download
            className="flex items-center justify-between rounded-2xl border p-4 transition-colors"
            style={{
              background: "linear-gradient(180deg, color-mix(in oklab, var(--color-surface) 94%, white), color-mix(in oklab, var(--color-surface-2) 86%, transparent))",
              borderColor: "var(--color-border)"
            }}
          >
            <div className="flex items-center gap-3 flex-1">
              <FileText
                size={20}
                style={{ color: "var(--color-brand-accent)" }}
              />
              <div className="flex-1">
                <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
                  {resource.title}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {formatFileSize(resource.fileSizeBytes)} • {getFileExtension(resource.title).toUpperCase()}
                </p>
              </div>
            </div>
            <Download
              size={18}
              style={{ color: "var(--color-text-secondary)" }}
              className="flex-shrink-0"
            />
          </a>
        ))}
      </div>
    </div>
  );
};
