import { env } from "../../config/env.js";
import { prisma } from "../../config/database.js";

type ValidationLevel = "ERROR" | "WARNING";

export type UploadValidationIssue = {
  code: string;
  level: ValidationLevel;
  message: string;
};

export type PreUploadValidationInput = {
  adminUserId: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
};

const normalizeFileName = (fileName: string) => fileName.trim().toLowerCase();

const getAllowedMimeTypes = () =>
  env.UPLOAD_ALLOWED_MIME_TYPES.split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

export const uploadValidationService = {
  async validatePreUpload(input: PreUploadValidationInput) {
    const issues: UploadValidationIssue[] = [];
    const normalizedName = normalizeFileName(input.fileName);
    const normalizedMimeType = input.mimeType.trim().toLowerCase();

    if (!normalizedName) {
      issues.push({
        code: "FILE_NAME_REQUIRED",
        level: "ERROR",
        message: "File name is required."
      });
    }

    if (!Number.isFinite(input.fileSizeBytes) || input.fileSizeBytes <= 0) {
      issues.push({
        code: "INVALID_FILE_SIZE",
        level: "ERROR",
        message: "File size must be a positive number."
      });
    } else if (input.fileSizeBytes > env.UPLOAD_MAX_FILE_SIZE_BYTES) {
      issues.push({
        code: "UPLOAD_FILE_TOO_LARGE",
        level: "ERROR",
        message: `File exceeds max size of ${env.UPLOAD_MAX_FILE_SIZE_BYTES} bytes.`
      });
    }

    const allowedMimeTypes = getAllowedMimeTypes();
    if (!normalizedMimeType) {
      issues.push({
        code: "MIME_TYPE_REQUIRED",
        level: "ERROR",
        message: "Mime type is required."
      });
    } else if (!allowedMimeTypes.includes(normalizedMimeType)) {
      issues.push({
        code: "UPLOAD_UNSUPPORTED_FILE_TYPE",
        level: "ERROR",
        message: "Mime type is not allowed."
      });
    }

    if (normalizedName) {
      const duplicateCount = await prisma.mediaFile.count({
        where: {
          uploadedById: input.adminUserId,
          originalFilename: {
            equals: input.fileName,
            mode: "insensitive"
          }
        }
      });

      if (duplicateCount > 0) {
        issues.push({
          code: "UPLOAD_DUPLICATE_DETECTED",
          level: "WARNING",
          message: "A media item with this filename already exists."
        });
      }
    }

    return {
      accepted: !issues.some((issue) => issue.level === "ERROR"),
      issues
    };
  }
};
