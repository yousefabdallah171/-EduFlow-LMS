import type { NextFunction, Request, Response } from "express";

import { UploadError, uploadService } from "../../services/upload.service.js";
import { chunkCheckpointService } from "../../services/upload/chunk-checkpoint.service.js";
import { uploadSessionService } from "../../services/upload/upload-session.service.js";
import { uploadAuditActions, uploadAuditService } from "../../services/audit/upload-audit.service.js";
import { uploadRetryPolicy } from "../../services/upload/upload-retry-policy.js";
import { batchReportService } from "../../services/upload/batch-report.service.js";
import { getUploadError, type UploadErrorCode } from "../../utils/upload-errors.js";
import { prisma } from "../../config/database.js";
import { prometheus } from "../../observability/prometheus.js";

const getFirstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const readBinaryBody = async (req: Request) => {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
};

const handleUploadError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof UploadError) {
    res.status(error.status).json({
      error: error.code,
      message: error.message
    });
    return;
  }

  next(error);
};

const respondUploadDomainError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof Error) {
    const descriptor = getUploadError(error.message as UploadErrorCode);
    if (descriptor) {
      res.status(descriptor.status).json({
        error: error.message,
        message: descriptor.message,
        retryable: descriptor.retryable
      });
      return true;
    }
  }

  next(error);
  return false;
};

export const adminUploadsController = {
  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const session = await uploadSessionService.createSession({
        adminUserId: req.user!.userId,
        fileName: req.body.fileName,
        fileSizeBytes: Number(req.body.fileSizeBytes),
        mimeType: req.body.mimeType,
        duplicatePolicy: req.body.duplicatePolicy
      });

      await uploadAuditService.log({
        adminUserId: req.user!.userId,
        action: uploadAuditActions.uploadSessionCreated,
        targetId: session.sessionId,
        metadata: {
          fileName: req.body.fileName,
          fileSizeBytes: req.body.fileSizeBytes,
          mimeType: req.body.mimeType,
          duplicatePolicy: req.body.duplicatePolicy
        }
      });

      res.status(201).json(session);
    } catch (error) {
      respondUploadDomainError(error, res, next);
    }
  },

  async getSession(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = getFirstValue(req.params.sessionId);
      if (!sessionId) {
        res.status(400).json({ error: "UPLOAD_SESSION_ID_REQUIRED" });
        return;
      }
      res.status(200).json({
        ...(await uploadSessionService.getSessionSummary(sessionId))
      });
      prometheus.recordUploadResume("success");
    } catch (error) {
      prometheus.recordUploadResume("failed");
      respondUploadDomainError(error, res, next);
    }
  },

  async patchSessionChunk(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = getFirstValue(req.params.sessionId);
      if (!sessionId) {
        res.status(400).json({ error: "UPLOAD_SESSION_ID_REQUIRED" });
        return;
      }

      const chunkIndexHeader = req.header("Upload-Chunk-Index");
      const chunkChecksum = req.header("Upload-Chunk-Checksum") ?? "";
      const chunkDurationMs = Number(req.header("Upload-Chunk-Duration-Ms") ?? "0");
      const chunkIndex = Number(chunkIndexHeader);
      const chunkPayload = await readBinaryBody(req);

      const acknowledgement = await chunkCheckpointService.acknowledgeChunk({
        sessionId,
        chunkIndex,
        chunkChecksum,
        chunkSizeBytes: chunkPayload.length,
        chunkDurationMs: Number.isFinite(chunkDurationMs) && chunkDurationMs > 0 ? chunkDurationMs : undefined
      });
      prometheus.recordUploadThroughput(chunkPayload.length);

      await uploadAuditService.log({
        adminUserId: req.user!.userId,
        action: uploadAuditActions.uploadChunkAcknowledged,
        targetId: sessionId,
        metadata: {
          acknowledgedChunkIndex: acknowledgement.acknowledgedChunkIndex,
          nextChunkIndex: acknowledgement.nextChunkIndex,
          chunkSizeBytes: chunkPayload.length
        }
      });

      res.status(200).json(acknowledgement);
    } catch (error) {
      respondUploadDomainError(error, res, next);
    }
  },

  async completeSession(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = getFirstValue(req.params.sessionId);

      if (!sessionId) {
        res.status(400).json({ error: "UPLOAD_SESSION_ID_REQUIRED" });
        return;
      }

      const completion = await uploadSessionService.completeSession(sessionId);
      await uploadAuditService.log({
        adminUserId: req.user!.userId,
        action: uploadAuditActions.uploadSessionCompleted,
        targetId: sessionId,
        metadata: {
          mediaAssetId: completion.mediaAssetId
        }
      });

      res.status(202).json(completion);
    } catch (error) {
      respondUploadDomainError(error, res, next);
    }
  },

  async retryFailed(_req: Request, res: Response, next: NextFunction) {
    try {
      const failedSessions = await prisma.uploadSession.findMany({
        where: {
          adminUserId: _req.user!.userId,
          status: "FAILED"
        },
        take: 200
      });

      let scheduledItems = 0;
      for (const session of failedSessions) {
        const decision = uploadRetryPolicy.getRetryDecision({
          attempt: session.retryAttempt,
          reason: "RETRY_FAILED_BATCH"
        });

        if (!decision.shouldRetry || !decision.nextRetryAt) {
          prometheus.recordUploadRetry("maxed");
          continue;
        }

        await prisma.uploadSession.update({
          where: { id: session.id },
          data: {
            retryAttempt: session.retryAttempt + 1,
            retryNextAt: decision.nextRetryAt,
            status: "QUEUED"
          }
        });

        scheduledItems += 1;
        prometheus.recordUploadRetry("scheduled");
      }

      const batchReport = await batchReportService.createRetryFailedReport({
        initiatedByUserId: _req.user!.userId,
        scheduledItems,
        totalFailedItems: failedSessions.length
      });

      res.status(202).json({
        batchReportId: batchReport.id,
        scheduledItems
      });
    } catch (error) {
      prometheus.recordUploadRetry("failed");
      next(error);
    }
  },

  async batchSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const reports = await batchReportService.getLatestSummary(req.user!.userId, 10);
      res.status(200).json({
        reports
      });
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const uploadId = await uploadService.createUpload({
        userId: req.user!.userId,
        uploadLengthHeader: req.header("Upload-Length") ?? undefined,
        uploadMetadataHeader: req.header("Upload-Metadata") ?? undefined
      });

      res.status(201).setHeader("Tus-Resumable", "1.0.0").setHeader("Location", `/api/v1/admin/uploads/${uploadId}`).end();
    } catch (error) {
      handleUploadError(error, res, next);
    }
  },

  async head(req: Request, res: Response, next: NextFunction) {
    try {
      const uploadId = getFirstValue(req.params.id);
      if (!uploadId) {
        res.status(400).json({ error: "UPLOAD_ID_REQUIRED" });
        return;
      }

      const upload = await uploadService.getOffset(uploadId);
      res
        .status(200)
        .setHeader("Tus-Resumable", "1.0.0")
        .setHeader("Upload-Length", String(upload.uploadLength))
        .setHeader("Upload-Offset", String(upload.uploadOffset))
        .end();
    } catch (error) {
      handleUploadError(error, res, next);
    }
  },

  async patch(req: Request, res: Response, next: NextFunction) {
    try {
      const uploadId = getFirstValue(req.params.id);
      if (!uploadId) {
        res.status(400).json({ error: "UPLOAD_ID_REQUIRED" });
        return;
      }

      const body = await readBinaryBody(req);
      const offset = await uploadService.appendChunk(uploadId, req.header("Upload-Offset") ?? undefined, body);
      res.status(204).setHeader("Tus-Resumable", "1.0.0").setHeader("Upload-Offset", String(offset)).end();
    } catch (error) {
      handleUploadError(error, res, next);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const uploadId = getFirstValue(req.params.id);
      if (!uploadId) {
        res.status(400).json({ error: "UPLOAD_ID_REQUIRED" });
        return;
      }

      await uploadService.cancelUpload(uploadId);
      res.status(204).end();
    } catch (error) {
      handleUploadError(error, res, next);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await uploadService.listUploads(req.user!.userId));
    } catch (error) {
      next(error);
    }
  }
};
