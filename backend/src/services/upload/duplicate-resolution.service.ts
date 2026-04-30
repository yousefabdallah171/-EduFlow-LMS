import { prisma } from "../../config/database.js";

export const duplicatePolicies = ["SKIP", "REPLACE", "UPLOAD_AS_NEW"] as const;
export type DuplicatePolicy = (typeof duplicatePolicies)[number];

export type DuplicateResolutionResult = {
  policy: DuplicatePolicy;
  duplicateMediaId: string | null;
};

type ResolveDuplicateInput = {
  adminUserId: string;
  fileName: string;
  duplicatePolicy?: string;
};

const normalizePolicy = (policy: string | undefined): DuplicatePolicy => {
  const normalized = (policy ?? "SKIP").toUpperCase();
  if (duplicatePolicies.includes(normalized as DuplicatePolicy)) {
    return normalized as DuplicatePolicy;
  }
  return "SKIP";
};

export const duplicateResolutionService = {
  async resolve(input: ResolveDuplicateInput): Promise<DuplicateResolutionResult> {
    const policy = normalizePolicy(input.duplicatePolicy);
    const duplicate = await prisma.mediaFile.findFirst({
      where: {
        uploadedById: input.adminUserId,
        originalFilename: {
          equals: input.fileName,
          mode: "insensitive"
        }
      },
      orderBy: { createdAt: "desc" },
      select: { id: true }
    });

    if (!duplicate) {
      return {
        policy,
        duplicateMediaId: null
      };
    }

    if (policy === "SKIP") {
      throw new Error("UPLOAD_DUPLICATE_DETECTED");
    }

    return {
      policy,
      duplicateMediaId: duplicate.id
    };
  }
};
