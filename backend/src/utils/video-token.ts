import crypto from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

export type VideoTokenPayload = {
  userId: string;
  lessonId: string;
  sessionId: string;
};

export type PreviewTokenPayload = {
  lessonId: string;
  previewSessionId: string;
  isPreview: true;
};

export const hashVideoToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");

export const signVideoToken = (payload: VideoTokenPayload): string =>
  jwt.sign(payload, env.VIDEO_TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: "5m",
    jwtid: crypto.randomUUID()
  });

export const signPreviewToken = (payload: PreviewTokenPayload): string =>
  jwt.sign(payload, env.VIDEO_TOKEN_SECRET, {
    algorithm: "HS256",
    expiresIn: "15m",
    jwtid: crypto.randomUUID()
  });

export const verifyVideoToken = (token: string): VideoTokenPayload | PreviewTokenPayload =>
  jwt.verify(token, env.VIDEO_TOKEN_SECRET) as VideoTokenPayload | PreviewTokenPayload;
