import type { NextFunction, Request, Response } from "express";

import { UploadError, uploadService } from "../../services/upload.service.js";

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

export const adminUploadsController = {
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
