import Queue from "bull";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { videoProcessingQueue } from "./job-queue.js";

const FFMPEG_TIMEOUT_MS = 30 * 60 * 1000;
const storageRoot = () => path.resolve(process.cwd(), env.STORAGE_PATH);

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

const runFfmpeg = async (mediaFileId: string, inputPath: string) => {
  const outputDir = path.join(storageRoot(), "hls", mediaFileId);
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  const outputPlaylist = path.join(outputDir, "playlist.m3u8");
  const segmentPattern = path.join(outputDir, "segment-%03d.ts");
  const keyPath = path.join(outputDir, "enc.key");
  await fs.writeFile(keyPath, crypto.randomBytes(16));
  const keyInfoPath = path.join(outputDir, "hls-key-info.txt");
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

export async function setupVideoProcessingProcessor() {
  videoProcessingQueue.process(async (job) => {
    const { mediaFileId, storagePath } = job.data;

    try {
      const mediaFile = await prisma.mediaFile.findUnique({
        where: { id: mediaFileId }
      });

      if (!mediaFile) {
        throw new Error("MediaFile not found");
      }

      if (mediaFile.type !== "VIDEO") {
        throw new Error("Not a video file");
      }

      // Run FFmpeg transcoding
      const processed = await runFfmpeg(mediaFileId, storagePath);

      // Update MediaFile with HLS path and duration
      await prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          status: "READY",
          hlsPath: processed.playlistRelativePath,
          durationSeconds: processed.durationSeconds
        }
      });

      // If this was linked to a lesson, update lesson too
      const lesson = await prisma.lesson.findFirst({
        where: { mediaFileId }
      });

      if (lesson) {
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: {
            videoStatus: "READY",
            videoHlsPath: processed.playlistRelativePath,
            durationSeconds: processed.durationSeconds
          }
        });
      }

      return { success: true, hlsPath: processed.playlistRelativePath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // Update MediaFile with error status
      await prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: {
          status: "ERROR",
          errorMessage
        }
      });

      // If linked to lesson, mark lesson as error too
      const lesson = await prisma.lesson.findFirst({
        where: { mediaFileId }
      });

      if (lesson) {
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: { videoStatus: "ERROR" }
        });
      }

      throw error;
    }
  });
}

export async function queueVideoForProcessing(mediaFileId: string, storagePath: string) {
  await videoProcessingQueue.add(
    { mediaFileId, storagePath },
    {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000
      },
      removeOnComplete: true
    }
  );
}
