import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

type BasePayload = {
  userId: string;
  role: "ADMIN" | "STUDENT";
  sessionId: string;
};

export type AccessTokenPayload = BasePayload;
export type RefreshTokenPayload = BasePayload & { familyId: string; tokenId: string };

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_SESSION_WINDOW_DAYS = 30;
export const REFRESH_SESSION_WINDOW_SECONDS = REFRESH_SESSION_WINDOW_DAYS * 24 * 60 * 60;
export const REFRESH_SESSION_WINDOW_MS = REFRESH_SESSION_WINDOW_SECONDS * 1000;
export const REFRESH_TOKEN_JWT_LIFETIME_DAYS = 365;
export const REFRESH_TOKEN_JWT_LIFETIME_SECONDS = REFRESH_TOKEN_JWT_LIFETIME_DAYS * 24 * 60 * 60;

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { algorithm: "HS256", expiresIn: ACCESS_TOKEN_TTL_SECONDS });

export const signRefreshToken = (payload: RefreshTokenPayload): string =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    algorithm: "HS256",
    expiresIn: REFRESH_TOKEN_JWT_LIFETIME_SECONDS
  });

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
