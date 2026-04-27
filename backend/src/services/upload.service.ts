import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { spawn } from "node:child_process";

import { env } from "../config/env.js";
import { prisma } from "../config/database.js";
import { redis } from "../config/redis.js";
import { lessonRepository } from "../repositories/lesson.repository.js";
import { videoUploadRepository } from "../repositories/video-upload.repository.js";
import { malwareScanService } from "./malware-scan.service.js";
import { queueVideoForProcessing } from "../jobs/index.js";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB
const ALLOWED_MIME_TYPES = {
  "video/mp4": "VIDEO",
  "video/quicktime": "VIDEO",
  "video/x-msvideo": "VIDEO",
  "video/x-matroska": "VIDEO",
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "image/gif": "IMAGE",
  "image/webp": "IMAGE",
  "application/pdf": "PDF",
  "application/msword": "DOCUMENT",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCUMENT",
  "application/vnd.ms-excel": "DOCUMENT",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "DOCUMENT",
};
const FFMPEG_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

type UploadState = {
  id: string;
  lessonId: string | null;
  mediaFileId: string | null;
  filename: string;
  contentType: string;
  uploadLength: number;
  offset: number;
  userId: string;
  folderId?: string;
  mediaType?: string;
};

const uploadStateKey = (uploadId: string) => `tus-upload:${uploadId}`;
const storageRoot = () => path.resolve(process.cwd(), env.STORAGE_PATH);
const rawUploadDir = () => path.join(storageRoot(), "uploads");
const rawUploadPath = (uploadId: string, filename: string) => path.join(rawUploadDir(), `${uploadId}-${filename}`);
const hlsDir = (lessonId: string) => path.join(storageRoot(), "hls", lessonId);
const hlsEncKeyPath = (lessonId: string) => path.join(hlsDir(lessonId), "enc.key");

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
    title: entries.title || null,
    lessonId: entries.lessonId || null,
    folderId: entries.folderId || null,
    contentType: entries.contentType ?? "application/octet-stream",
    mediaType: entries.mediaType || null
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

const getDurationSeconds = async (inputPath: string): Promise<number> => {
  return new Promise<number>((resolve) => {
    let durationOutput = '';
    const child = spawn("ffmpeg", ["-i", inputPath]);

    child.stderr?.on("data", (data) => {
      durationOutput += data.toString();
    });

    child.on("exit", () => {
      const match = durationOutput.match(/Duration: (\d+):(\d+):(\d+(\.\d+)?)/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const seconds = parseFloat(match[3]);
        resolve(hours * 3600 + minutes * 60 + Math.ceil(seconds));
      } else {
        resolve(10);
      }
    });

    child.on("error", () => {
      resolve(10);
    });
  });
};

const runFfmpeg = async (lessonId: string, inputPath: string) => {
  const outputDir = hlsDir(lessonId);
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  const outputPlaylist = path.join(outputDir, "playlist.m3u8");
  const segmentPattern = path.join(outputDir, "segment-%03d.ts");
  const keyPath = hlsEncKeyPath(lessonId);
  await fs.writeFile(keyPath, crypto.randomBytes(16));
  const keyInfoPath = path.join(outputDir, "hls-key-info.txt");
  // The URI is rewritten by lesson.controller.ts to an authenticated /key endpoint.
  await fs.writeFile(keyInfoPath, ["enc.key", keyPath, ""].join("\n"));

  const durationSeconds = await getDurationSeconds(inputPath);

  if (process.env.NODE_ENV === "test") {
    await fs.writeFile(
      outputPlaylist,
      ['#EXTM3U', '#EXT-X-KEY:METHOD=AES-128,URI="enc.key"', `#EXTINF:${durationSeconds}.0,`, "segment-000.ts", "#EXT-X-ENDLIST"].join(
        "\n"
      )
    );
    await fs.writeFile(path.join(outputDir, "segment-000.ts"), await fs.readFile(inputPath));

    return {
      playlistRelativePath: path.relative(storageRoot(), outputPlaylist),
      durationSeconds
    };
  }

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
      "-hls_key_info_file",
      keyInfoPath,
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
          durationSeconds
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

    // Check if content type is allowed
    if (!(metadata.contentType in ALLOWED_MIME_TYPES)) {
      throw new UploadError("INVALID_CONTENT_TYPE", 415, "File type not supported. Allowed: video, image, PDF, documents.");
    }

    // Validate lesson exists if provided
    if (metadata.lessonId) {
      const lesson = await lessonRepository.findById(metadata.lessonId);
      if (!lesson) {
        throw new UploadError("LESSON_NOT_FOUND", 404, "Lesson not found.");
      }
    }

    await ensureStorage();

    // Detect media type from MIME type if not provided
    const mediaType = metadata.mediaType || (ALLOWED_MIME_TYPES[metadata.contentType as keyof typeof ALLOWED_MIME_TYPES] || "OTHER");

    // Create MediaFile record for library
    const mediaFile = await prisma.mediaFile.create({
      data: {
        title: metadata.title || metadata.filename,
        type: mediaType as any,
        originalFilename: metadata.filename,
        mimeType: metadata.contentType,
        sizeBytes: BigInt(uploadLength),
        folderId: metadata.folderId || null,
        uploadedById: input.userId,
        status: "UPLOADING"
      }
    });

    // Create VideoUpload record for backward compatibility
    const upload = await videoUploadRepository.create({
      lesson: metadata.lessonId ? { connect: { id: metadata.lessonId } } : undefined,
      uploadedBy: { connect: { id: input.userId } },
      filename: metadata.filename,
      sizeBytes: BigInt(uploadLength),
      mediaFile: { connect: { id: mediaFile.id } }
    });

    const finalPath = rawUploadPath(upload.id, metadata.filename);
    await fs.writeFile(finalPath, Buffer.alloc(0));
    await videoUploadRepository.updateStatus(upload.id, {
      storagePath: finalPath
    });

    // Update MediaFile with storage path
    await prisma.mediaFile.update({
      where: { id: mediaFile.id },
      data: { storagePath: finalPath, tusUploadId: upload.id }
    });

    const state: UploadState = {
      id: upload.id,
      lessonId: metadata.lessonId || null,
      mediaFileId: mediaFile.id,
      filename: metadata.filename,
      contentType: metadata.contentType,
      uploadLength,
      offset: 0,
      userId: input.userId,
      folderId: metadata.folderId,
      mediaType
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
    if (!upload?.storagePath) {
      return;
    }

    const mediaFile = upload.mediaFileId ? await prisma.mediaFile.findUnique({ where: { id: upload.mediaFileId } }) : null;

    // For non-video files, mark as READY immediately
    if (mediaFile && mediaFile.type !== "VIDEO") {
      await prisma.mediaFile.update({
        where: { id: mediaFile.id },
        data: { status: "READY" }
      });
      await videoUploadRepository.updateStatus(uploadId, { status: "READY" });
      await deleteUploadState(uploadId);
      return;
    }

    // For videos, enqueue transcoding job
    if (mediaFile && mediaFile.type === "VIDEO") {
      await prisma.mediaFile.update({
        where: { id: mediaFile.id },
        data: { status: "PROCESSING" }
      });
      await videoUploadRepository.updateStatus(uploadId, { status: "PROCESSING" });

      try {
        const scanResult = await malwareScanService.scanFile(upload.storagePath);
        if (scanResult.isInfected) {
          throw new Error("Malware detected. Upload rejected.");
        }

        // Enqueue video transcoding job
        await queueVideoForProcessing(mediaFile.id, upload.storagePath);
      } catch (error) {
        await prisma.mediaFile.update({
          where: { id: mediaFile.id },
          data: {
            status: "ERROR",
            errorMessage: error instanceof Error ? error.message : "Upload processing failed."
          }
        });
        await videoUploadRepository.updateStatus(uploadId, {
          status: "ERROR",
          errorMessage: error instanceof Error ? error.message : "Upload processing failed."
        });
        throw error;
      }
      return;
    }

    // Backward compatibility: if lesson-based upload without mediaFile
    if (upload.lessonId && !mediaFile) {
      await videoUploadRepository.updateStatus(uploadId, { status: "PROCESSING" });
      await prisma.lesson.update({
        where: { id: upload.lessonId },
        data: { videoStatus: "PROCESSING" }
      });

      try {
        const scanResult = await malwareScanService.scanFile(upload.storagePath);
        if (scanResult.isInfected) {
          throw new Error("Malware detected. Upload rejected.");
        }

        const processed = await runFfmpeg(upload.lessonId, upload.storagePath);

        await prisma.lesson.update({
          where: { id: upload.lessonId },
          data: {
            videoStatus: "READY",
            videoHlsPath: processed.playlistRelativePath,
            durationSeconds: processed.durationSeconds
          }
        });

        await videoUploadRepository.updateStatus(uploadId, { status: "READY" });
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
  }
};
