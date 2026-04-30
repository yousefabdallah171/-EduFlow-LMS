import { prisma } from "../../config/database.js";

export const uploadAuditActions = {
  uploadSessionCreated: "UPLOAD_SESSION_CREATED",
  uploadChunkAcknowledged: "UPLOAD_CHUNK_ACKNOWLEDGED",
  uploadSessionCompleted: "UPLOAD_SESSION_COMPLETED",
  uploadSessionFailed: "UPLOAD_SESSION_FAILED",
  lessonAttachmentApplied: "LESSON_ATTACHMENT_APPLIED",
  lessonAttachmentBulkApplied: "LESSON_ATTACHMENT_BULK_APPLIED"
} as const;

type UploadAuditAction = (typeof uploadAuditActions)[keyof typeof uploadAuditActions];

type UploadAuditPayload = {
  adminUserId: string;
  action: UploadAuditAction;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

export const uploadAuditService = {
  async log({ adminUserId, action, targetId, metadata }: UploadAuditPayload): Promise<void> {
    try {
      await prisma.adminAuditLog.create({
        data: {
          adminId: adminUserId,
          action,
          targetId: targetId ?? null,
          reason: "UPLOAD_WORKFLOW",
          metadata: metadata ?? {}
        }
      });
    } catch (error) {
      console.error("[upload-audit] failed", error);
    }
  }
};
