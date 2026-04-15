import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { prisma } from "../config/database.js";
import { redis } from "../config/redis.js";
import { lessonRepository } from "../repositories/lesson.repository.js";
import { videoUploadRepository } from "../repositories/video-upload.repository.js";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB
const ALLOWED_MIME_PREFIXES = ["video/"];
const FFMPEG_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

type UploadState = {
  id: string;
  lessonId: string | null;
  filename: string;
  contentType: string;
  uploadLength: number;
  offset: number;
  userId: string;
};

const uploadStateKey = (uploadId: string) => `tus-upload:${uploadId}`;
const storageRoot = () => path.resolve(process.cwd(), "storage");
const rawUploadDir = () => path.join(storageRoot(), "uploads");
const rawUploadPath = (uploadId: string, filename: string) => path.join(rawUploadDir(), `${uploadId}-${filename}`);
const hlsDir = (lessonId: string) => path.join(storageRoot(), "hls", lessonId);

const parseUploadMetadata = (value: string | undefined) => {
  const entries = Object.fromEntries(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [key, encoded = ""] = entry.split(" ");
        return [key, Buffer.from(encoded, "base64").toString("utf8")];
      })
  );

  return {
    filename: entries.filename ?? "upload.bin",
    lessonId: entries.lessonId || null,
    contentType: entries.contentType ?? "application/octet-stream"
  };
};

const readUploadState = async (uploadId: string): Promise<UploadState | null> => {
  const state = await redis.get(uploadStateKey(uploadId));
  return state ? (JSON.parse(state) as UploadState) : null;
};

const writeUploadState = async (state: UploadState) => {
  await redis.set(uploadStateKey(state.id), JSON.stringify(state), "EX", 7 * 24 * 60 * 60);
};

const deleteUploadState = async (uploadId: string) => {
  await redis.del(uploadStateKey(uploadId));
};

const ensureStorage = async () => {
  await fs.mkdir(rawUploadDir(), { recursive: true });
};

const runFfmpeg = async (lessonId: string, inputPath: string) => {
  const outputDir = hlsDir(lessonId);
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  const outputPlaylist = path.join(outputDir, "playlist.m3u8");
  const segmentPattern = path.join(outputDir, "segment-%03d.ts");

  return new Promise<{ playlistRelativePath: string; durationSeconds: number }>((resolve, reject) => {
    const child = spawn("ffmpeg", [
      "-y",
      "-i",
      inputPath,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-profile:v",
      "main",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-hls_time",
      "6",
      "-hls_playlist_type",
      "vod",
      "-hls_flags",
      "independent_segments",
      "-hls_segment_filename",
      segmentPattern,
      "-f",
      "hls",
      outputPlaylist
    ]);

    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("ffmpeg timed out after 30 minutes."));
    }, FFMPEG_TIMEOUT_MS);

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    child.on("exit", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({
          playlistRelativePath: path.relative(storageRoot(), outputPlaylist),
          durationSeconds: 10
        });
        return;
      }

      reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
};

export class UploadError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export const uploadService = {
  async createUpload(input: {
    userId: string;
    uploadLengthHeader: string | undefined;
    uploadMetadataHeader: string | undefined;
  }) {
    const uploadLength = Number(input.uploadLengthHeader);
    if (!Number.isFinite(uploadLength) || uploadLength <= 0) {
      throw new UploadError("INVALID_UPLOAD_LENGTH", 400, "Upload-Length must be a positive number.");
    }

    if (uploadLength > MAX_UPLOAD_BYTES) {
      throw new UploadError("UPLOAD_TOO_LARGE", 413, `Upload exceeds the maximum allowed size of ${MAX_UPLOAD_BYTES / 1024 / 1024 / 1024} GB.`);
    }

    const metadata = parseUploadMetadata(input.uploadMetadataHeader);

    if (!ALLOWED_MIME_PREFIXES.some((prefix) => metadata.contentType.startsWith(prefix))) {
      throw new UploadError("INVALID_CONTENT_TYPE", 415, "Only video files are accepted.");
    }
    if (metadata.lessonId) {
      const lesson = await lessonRepository.findById(metadata.lessonId);
      if (!lesson) {
        throw new UploadError("LESSON_NOT_FOUND", 404, "Lesson not found.");
      }
    }

    await ensureStorage();

    const upload = await videoUploadRepository.create({
      lesson: metadata.lessonId ? { connect: { id: metadata.lessonId } } : undefined,
      uploadedBy: { connect: { id: input.userId } },
      filename: metadata.filename,
      sizeBytes: BigInt(uploadLength)
    });

    const finalPath = rawUploadPath(upload.id, metadata.filename);
    await fs.writeFile(finalPath, Buffer.alloc(0));
    await videoUploadRepository.updateStatus(upload.id, {
      storagePath: finalPath
    });

    const state: UploadState = {
      id: upload.id,
      lessonId: metadata.lessonId,
      filename: metadata.filename,
      contentType: metadata.contentType,
      uploadLength,
      offset: 0,
      userId: input.userId
    };
    await writeUploadState(state);

    return upload.id;
  },

  async getOffset(uploadId: string) {
    const state = await readUploadState(uploadId);
    const upload = await videoUploadRepository.findById(uploadId);

    if (!state || !upload) {
      throw new UploadError("UPLOAD_NOT_FOUND", 404, "Upload not found.");
    }

    return {
      uploadLength: state.uploadLength,
      uploadOffset: state.offset
    };
  },

  async appendChunk(uploadId: string, expectedOffsetHeader: string | undefined, chunk: Buffer) {
    const state = await readUploadState(uploadId);
    const upload = await videoUploadRepository.findById(uploadId);

    if (!state || !upload?.storagePath) {
      throw new UploadError("UPLOAD_NOT_FOUND", 404, "Upload not found.");
    }

    const expectedOffset = Number(expectedOffsetHeader);
    if (!Number.isFinite(expectedOffset) || expectedOffset !== state.offset) {
      throw new UploadError("OFFSET_MISMATCH", 409, "Upload offset mismatch.");
    }

    await fs.appendFile(upload.storagePath, chunk);

    state.offset += chunk.length;
    await writeUploadState(state);
    await videoUploadRepository.updateOffset(uploadId, BigInt(state.offset));

    if (state.offset >= state.uploadLength) {
      await videoUploadRepository.updateStatus(uploadId, {
        status: "COMPLETE",
        completedAt: new Date()
      });
      await this.processUpload(uploadId);
    }

    return state.offset;
  },

  async cancelUpload(uploadId: string) {
    const upload = await videoUploadRepository.findById(uploadId);
    if (!upload) {
      return;
    }

    if (upload.storagePath) {
      await fs.rm(upload.storagePath, { force: true }).catch(() => undefined);
    }

    await deleteUploadState(uploadId);
    await videoUploadRepository.updateStatus(uploadId, {
      status: "CANCELLED"
    });
  },

  async listUploads(userId: string) {
    const uploads = await videoUploadRepository.listByUploader(userId);
    return {
      uploads: uploads.map((upload) => ({
        id: upload.id,
        filename: upload.filename,
        sizeBytes: Number(upload.sizeBytes),
        offsetBytes: Number(upload.offsetBytes),
        status: upload.status,
        lessonId: upload.lessonId,
        createdAt: upload.createdAt
      }))
    };
  },

  async processUpload(uploadId: string) {
    const upload = await videoUploadRepository.findById(uploadId);
    if (!upload?.lessonId || !upload.storagePath) {
      return;
    }

    await videoUploadRepository.updateStatus(uploadId, { status: "PROCESSING" });
    await prisma.lesson.update({
      where: { id: upload.lessonId },
      data: { videoStatus: "PROCESSING" }
    });

    try {
      const processed = await runFfmpeg(upload.lessonId, upload.storagePath);

      await prisma.lesson.update({
        where: { id: upload.lessonId },
        data: {
          videoStatus: "READY",
          videoHlsPath: processed.playlistRelativePath,
          durationSeconds: processed.durationSeconds
        }
      });

      await videoUploadRepository.updateStatus(uploadId, {
        status: "READY"
      });
      await deleteUploadState(uploadId);
    } catch (error) {
      await prisma.lesson.update({
        where: { id: upload.lessonId },
        data: { videoStatus: "ERROR" }
      });
      await videoUploadRepository.updateStatus(uploadId, {
        status: "ERROR",
        errorMessage: error instanceof Error ? error.message : "Upload processing failed."
      });
      throw error;
    }
  }
};
