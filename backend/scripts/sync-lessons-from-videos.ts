import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

type SectionKey = "introduction" | "foundations" | "advanced" | "production";

type VideoMapEntry = {
  fileName: string;
  lessonId: string;
  sortOrder: number;
  sectionKey: SectionKey;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  isPreview?: boolean;
  isPublished?: boolean;
};

type GeneratedLesson = {
  id: string;
  sortOrder: number;
  sectionKey: SectionKey;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  isPreview: boolean;
  isPublished: boolean;
  durationSeconds: number;
  fileName: string;
};

const DEFAULT_VIDEO_DIR =
  "D:\\الكورسص\\ready\\المشروع الاول\\New folder\\New folder\\output";
const root = process.cwd();
const mapPath = path.resolve(root, "prisma", "videos-map.json");
const generatedPath = path.resolve(root, "prisma", "generated-lessons.json");
const videoDir = process.env.VIDEO_SOURCE_DIR?.trim() || DEFAULT_VIDEO_DIR;
const validSectionKeys = new Set<SectionKey>(["introduction", "foundations", "advanced", "production"]);

const runFfprobe = (filePath: string) =>
  new Promise<number>((resolve, reject) => {
    const args = [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=nw=1:nk=1",
      filePath
    ];
    const child = spawn("ffprobe", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";

    child.stdout.on("data", (chunk) => {
      out += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      err += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed for "${filePath}": ${err || `exit ${code}`}`));
        return;
      }
      const seconds = Math.round(Number(out.trim()));
      if (!Number.isFinite(seconds) || seconds <= 0) {
        reject(new Error(`Invalid duration for "${filePath}"`));
        return;
      }
      resolve(seconds);
    });
  });

const assertNoDuplicates = (items: string[], label: string) => {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item)) {
      throw new Error(`Duplicate ${label}: ${item}`);
    }
    seen.add(item);
  }
};

const assertNoDuplicateNumbers = (items: number[], label: string) => {
  const seen = new Set<number>();
  for (const item of items) {
    if (seen.has(item)) {
      throw new Error(`Duplicate ${label}: ${item}`);
    }
    seen.add(item);
  }
};

const main = async () => {
  const rawMap = await fs.readFile(mapPath, "utf8");
  const entries = JSON.parse(rawMap) as VideoMapEntry[];

  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("videos-map.json must be a non-empty array.");
  }

  assertNoDuplicates(entries.map((entry) => entry.fileName), "fileName");
  assertNoDuplicates(entries.map((entry) => entry.lessonId), "lessonId");
  assertNoDuplicateNumbers(entries.map((entry) => entry.sortOrder), "sortOrder");
  for (const entry of entries) {
    if (!validSectionKeys.has(entry.sectionKey)) {
      throw new Error(`Invalid sectionKey for ${entry.lessonId}: ${entry.sectionKey}`);
    }
    if (!entry.titleAr.trim() || !entry.titleEn.trim()) {
      throw new Error(`Missing titleAr/titleEn for ${entry.lessonId}`);
    }
    if (!entry.descriptionAr.trim() || !entry.descriptionEn.trim()) {
      throw new Error(`Missing descriptionAr/descriptionEn for ${entry.lessonId}`);
    }
  }

  const videoFiles = await fs.readdir(videoDir);
  const mp4Set = new Set(videoFiles.filter((name) => name.toLowerCase().endsWith(".mp4")));

  for (const entry of entries) {
    if (!mp4Set.has(entry.fileName)) {
      throw new Error(`Mapped file not found in source folder: ${entry.fileName}`);
    }
  }

  const mappedFileSet = new Set(entries.map((entry) => entry.fileName));
  const unmappedFiles = [...mp4Set].filter((fileName) => !mappedFileSet.has(fileName));
  if (unmappedFiles.length > 0) {
    throw new Error(
      `Unmapped videos detected (${unmappedFiles.length}):\n${unmappedFiles.join("\n")}`
    );
  }

  const generated: GeneratedLesson[] = [];
  for (const entry of entries) {
    const filePath = path.join(videoDir, entry.fileName);
    const durationSeconds = await runFfprobe(filePath);
    generated.push({
      id: entry.lessonId,
      sortOrder: entry.sortOrder,
      sectionKey: entry.sectionKey,
      titleAr: entry.titleAr.trim(),
      titleEn: entry.titleEn.trim(),
      descriptionAr: entry.descriptionAr.trim(),
      descriptionEn: entry.descriptionEn.trim(),
      isPreview: entry.isPreview ?? false,
      isPublished: entry.isPublished ?? true,
      durationSeconds,
      fileName: entry.fileName
    });
  }

  generated.sort((a, b) => a.sortOrder - b.sortOrder);
  await fs.writeFile(generatedPath, JSON.stringify(generated, null, 2), "utf8");

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: true,
        videoDir,
        mappedLessons: generated.length,
        output: generatedPath,
        totalDurationSeconds: generated.reduce((sum, lesson) => sum + lesson.durationSeconds, 0)
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
