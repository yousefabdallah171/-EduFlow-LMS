import { useMemo, useRef, useState, type ChangeEvent } from "react";

import { uploadConfig } from "@/lib/upload-config";
import { useUploadQueue } from "@/hooks/useUploadQueue";

type DroppedFileLike = {
  name: string;
  size: number;
  type: string;
};

export type DropzoneSummary = {
  accepted: number;
  rejected: number;
  rejectedDetails: Array<{ fileName: string; reason: string }>;
  acceptedFiles: File[];
};

const normalizeName = (name: string) => name.trim().toLowerCase();

export const summarizeDroppedFiles = (
  files: File[],
  options?: {
    allowedMimeTypes?: string[];
    maxSizeBytes?: number;
    existingNames?: string[];
  }
): DropzoneSummary => {
  const allowedMimeTypes = (options?.allowedMimeTypes ?? uploadConfig.acceptedMimeTypes).map((entry) => entry.toLowerCase());
  const maxSizeBytes = options?.maxSizeBytes ?? uploadConfig.maxFileSizeBytes;
  const existingNames = new Set((options?.existingNames ?? []).map(normalizeName));
  const seenNames = new Set<string>();

  const acceptedFiles: File[] = [];
  const rejectedDetails: Array<{ fileName: string; reason: string }> = [];

  for (const file of files) {
    const normalizedType = file.type.toLowerCase();
    const normalizedFileName = normalizeName(file.name);

    if (!allowedMimeTypes.includes(normalizedType)) {
      rejectedDetails.push({ fileName: file.name, reason: "Unsupported file type" });
      continue;
    }

    if (file.size > maxSizeBytes) {
      rejectedDetails.push({ fileName: file.name, reason: "File size exceeds limit" });
      continue;
    }

    if (existingNames.has(normalizedFileName) || seenNames.has(normalizedFileName)) {
      rejectedDetails.push({ fileName: file.name, reason: "Duplicate filename" });
      continue;
    }

    seenNames.add(normalizedFileName);
    acceptedFiles.push(file);
  }

  return {
    accepted: acceptedFiles.length,
    rejected: rejectedDetails.length,
    rejectedDetails,
    acceptedFiles
  };
};

export function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [summary, setSummary] = useState<DropzoneSummary>({
    accepted: 0,
    rejected: 0,
    rejectedDetails: [],
    acceptedFiles: []
  });
  const { enqueueFiles, items } = useUploadQueue();

  const existingNames = useMemo(() => items.map((item) => item.fileName), [items]);

  const handleFiles = (files: File[]) => {
    const nextSummary = summarizeDroppedFiles(files, {
      existingNames
    });
    setSummary(nextSummary);

    if (nextSummary.acceptedFiles.length > 0) {
      enqueueFiles(nextSummary.acceptedFiles);
    }
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList) {
      return;
    }
    handleFiles(Array.from(fileList));
    event.currentTarget.value = "";
  };

  return (
    <section className="rounded-xl border border-dashed border-gray-300 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={onInputChange}
        className="hidden"
        data-testid="upload-dropzone-input"
      />
      <div
        className={`rounded-lg border p-6 text-center transition-colors ${
          isDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : "border-gray-200 dark:border-gray-700"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFiles(Array.from(event.dataTransfer.files ?? []));
        }}
      >
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Drag and drop files or folders</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Accepted: {uploadConfig.acceptedMimeTypes.join(", ")} · Max {Math.floor(uploadConfig.maxFileSizeBytes / (1024 * 1024 * 1024))}GB
        </p>
        <button
          type="button"
          className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          onClick={() => inputRef.current?.click()}
        >
          Select Files
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-950/30 dark:text-green-300">
          Accepted: {summary.accepted}
        </div>
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">
          Rejected: {summary.rejected}
        </div>
      </div>

      {summary.rejectedDetails.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-red-600 dark:text-red-400">
          {summary.rejectedDetails.slice(0, 6).map((item) => (
            <li key={`${item.fileName}-${item.reason}`}>
              {item.fileName} — {item.reason}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
