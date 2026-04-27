const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();
  return normalizedValue === "true" || normalizedValue === "1";
};

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
};

const parseList = (value: string | undefined, fallback: string[]) => {
  if (!value) {
    return fallback;
  }

  const parsedList = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parsedList.length > 0 ? parsedList : fallback;
};

export const uploadConfig = {
  featureEnabled: parseBoolean(import.meta.env.VITE_UPLOAD_FEATURE_ENABLED, true),
  protocol: import.meta.env.VITE_UPLOAD_PROTOCOL ?? "TUS",
  minChunkSizeBytes: parsePositiveInt(import.meta.env.VITE_UPLOAD_MIN_CHUNK_SIZE_BYTES, 1 * 1024 * 1024),
  defaultChunkSizeBytes: parsePositiveInt(import.meta.env.VITE_UPLOAD_DEFAULT_CHUNK_SIZE_BYTES, 2 * 1024 * 1024),
  maxChunkSizeBytes: parsePositiveInt(import.meta.env.VITE_UPLOAD_MAX_CHUNK_SIZE_BYTES, 20 * 1024 * 1024),
  maxConcurrency: parsePositiveInt(import.meta.env.VITE_UPLOAD_MAX_CONCURRENCY, 2),
  maxRetryAttempts: parsePositiveInt(import.meta.env.VITE_UPLOAD_MAX_RETRY_ATTEMPTS, 3),
  retryInitialDelaySeconds: parsePositiveInt(import.meta.env.VITE_UPLOAD_RETRY_INITIAL_DELAY_SECONDS, 5),
  retryMaxDelaySeconds: parsePositiveInt(import.meta.env.VITE_UPLOAD_RETRY_MAX_DELAY_SECONDS, 30),
  telemetrySampleIntervalMs: parsePositiveInt(import.meta.env.VITE_UPLOAD_TELEMETRY_SAMPLE_INTERVAL_MS, 1000),
  maxFileSizeBytes: parsePositiveInt(import.meta.env.VITE_UPLOAD_MAX_FILE_SIZE_BYTES, 5 * 1024 * 1024 * 1024),
  acceptedMimeTypes: parseList(import.meta.env.VITE_UPLOAD_ACCEPTED_MIME_TYPES, [
    "video/mp4",
    "video/quicktime",
    "video/webm"
  ])
} as const;

export type UploadConfig = typeof uploadConfig;
