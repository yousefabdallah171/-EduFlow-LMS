import { prisma } from "../../config/database.js";

type AutoMapInput = {
  lessonIds?: string[];
  mediaAssetIds?: string[];
};

type MatchResult = {
  lessonId: string;
  mediaAssetId: string;
  confidence: number;
  reason: string;
};

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_\-\s]+/g, " ")
    .trim();

const tokenize = (value: string) =>
  normalizeName(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);

const getSimilarity = (a: string, b: string) => {
  const aTokens = tokenize(a);
  const bTokens = tokenize(b);
  if (aTokens.length === 0 || bTokens.length === 0) {
    return 0;
  }

  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  let intersection = 0;
  for (const token of aSet) {
    if (bSet.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...aSet, ...bSet]).size;
  return union === 0 ? 0 : intersection / union;
};

export const lessonMediaMatchingService = {
  async autoMap(input: AutoMapInput) {
    const lessons = await prisma.lesson.findMany({
      where: input.lessonIds?.length ? { id: { in: input.lessonIds } } : undefined,
      select: {
        id: true,
        titleEn: true,
        titleAr: true
      }
    });

    const mediaAssets = await prisma.mediaFile.findMany({
      where: {
        ...(input.mediaAssetIds?.length ? { id: { in: input.mediaAssetIds } } : {}),
        status: "READY",
        type: "VIDEO"
      },
      select: {
        id: true,
        title: true,
        originalFilename: true
      }
    });

    const matches: MatchResult[] = [];
    const matchedLessonIds = new Set<string>();
    const matchedMediaIds = new Set<string>();

    for (const lesson of lessons) {
      const lessonNames = [lesson.titleEn, lesson.titleAr].filter(Boolean);
      let bestMatch: MatchResult | null = null;

      for (const mediaAsset of mediaAssets) {
        if (matchedMediaIds.has(mediaAsset.id)) {
          continue;
        }

        const candidateNames = [mediaAsset.title, mediaAsset.originalFilename].filter(Boolean);
        let bestSimilarity = 0;
        for (const lessonName of lessonNames) {
          for (const candidateName of candidateNames) {
            bestSimilarity = Math.max(bestSimilarity, getSimilarity(lessonName, candidateName));
          }
        }

        if (bestSimilarity >= 0.5 && (!bestMatch || bestSimilarity > bestMatch.confidence)) {
          bestMatch = {
            lessonId: lesson.id,
            mediaAssetId: mediaAsset.id,
            confidence: Number(bestSimilarity.toFixed(2)),
            reason: bestSimilarity >= 0.85 ? "normalized-name-exact" : "normalized-name-partial"
          };
        }
      }

      if (bestMatch) {
        matches.push(bestMatch);
        matchedLessonIds.add(bestMatch.lessonId);
        matchedMediaIds.add(bestMatch.mediaAssetId);
      }
    }

    return {
      matches,
      unmatchedLessonIds: lessons.filter((lesson) => !matchedLessonIds.has(lesson.id)).map((lesson) => lesson.id),
      unmatchedMediaAssetIds: mediaAssets.filter((media) => !matchedMediaIds.has(media.id)).map((media) => media.id)
    };
  }
};
