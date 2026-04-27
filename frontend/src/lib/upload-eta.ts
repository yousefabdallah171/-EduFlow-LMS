type SamplePoint = {
  uploadedBytes: number;
  timestampMs: number;
};

type TelemetrySnapshot = {
  instantaneousSpeedBytesPerSecond: number;
  averageSpeedBytesPerSecond: number;
  etaSeconds: number | null;
  progressPercent: number;
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

export class UploadTelemetryTracker {
  private readonly sampleWindowSize: number;
  private readonly samples: SamplePoint[];
  private readonly totalBytes: number;
  private readonly startedAtMs: number;

  constructor(totalBytes: number, sampleWindowSize = 8) {
    this.sampleWindowSize = sampleWindowSize;
    this.samples = [];
    this.totalBytes = Math.max(totalBytes, 1);
    this.startedAtMs = Date.now();
  }

  track(uploadedBytes: number, timestampMs = Date.now()): TelemetrySnapshot {
    const clampedUploaded = Math.max(0, Math.min(uploadedBytes, this.totalBytes));
    this.samples.push({
      uploadedBytes: clampedUploaded,
      timestampMs
    });

    if (this.samples.length > this.sampleWindowSize) {
      this.samples.shift();
    }

    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];

    const windowDurationSec = Math.max((last.timestampMs - first.timestampMs) / 1000, 1);
    const windowUploadedBytes = Math.max(last.uploadedBytes - first.uploadedBytes, 0);
    const instantaneousSpeed = windowUploadedBytes / windowDurationSec;

    const elapsedSec = Math.max((timestampMs - this.startedAtMs) / 1000, 1);
    const averageSpeed = clampedUploaded / elapsedSec;
    const remainingBytes = Math.max(this.totalBytes - clampedUploaded, 0);
    const effectiveSpeed = instantaneousSpeed > 0 ? instantaneousSpeed : averageSpeed;
    const etaSeconds = effectiveSpeed > 0 ? Math.ceil(remainingBytes / effectiveSpeed) : null;

    return {
      instantaneousSpeedBytesPerSecond: instantaneousSpeed,
      averageSpeedBytesPerSecond: averageSpeed,
      etaSeconds,
      progressPercent: clampPercent((clampedUploaded / this.totalBytes) * 100)
    };
  }
}

export const formatEta = (etaSeconds: number | null) => {
  if (etaSeconds === null) {
    return "--";
  }

  if (etaSeconds < 60) {
    return `${etaSeconds}s`;
  }

  const minutes = Math.floor(etaSeconds / 60);
  const seconds = etaSeconds % 60;
  return `${minutes}m ${seconds}s`;
};
