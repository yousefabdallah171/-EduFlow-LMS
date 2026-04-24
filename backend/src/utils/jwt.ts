import jwt from "jsonwebtoken";
import crypto from "node:crypto";

import { env } from "../config/env.js";

type BasePayload = {
  userId: string;
  role: "ADMIN" | "STUDENT";
  sessionId: string;
  sub?: string; // Subject claim
  iss?: string; // Issuer claim
  aud?: string; // Audience claim
  jti?: string; // JWT ID (for token binding and revocation)
};

export type AccessTokenPayload = BasePayload;
export type RefreshTokenPayload = BasePayload & { familyId: string; tokenId: string };

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_SESSION_WINDOW_DAYS = 30;
export const REFRESH_SESSION_WINDOW_SECONDS = REFRESH_SESSION_WINDOW_DAYS * 24 * 60 * 60;
export const REFRESH_SESSION_WINDOW_MS = REFRESH_SESSION_WINDOW_SECONDS * 1000;
export const REFRESH_TOKEN_JWT_LIFETIME_DAYS = 365;
export const REFRESH_TOKEN_JWT_LIFETIME_SECONDS = REFRESH_TOKEN_JWT_LIFETIME_DAYS * 24 * 60 * 60;

const JWT_ISSUER = "eduflow-api";
const JWT_AUDIENCE = "eduflow-app";

const addSecurityClaims = (payload: BasePayload): Record<string, unknown> => ({
  ...payload,
  sub: payload.userId,
  iss: JWT_ISSUER,
  aud: JWT_AUDIENCE,
  jti: payload.jti || crypto.randomBytes(16).toString("hex")
});

export const signAccessToken = (payload: AccessTokenPayload): string => {
  const securePayload = addSecurityClaims(payload);
  return jwt.sign(securePayload, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    notBefore: 0
  });
};

export const signRefreshToken = (payload: RefreshTokenPayload): string => {
  const securePayload = addSecurityClaims(payload);
  return jwt.sign(securePayload, env.JWT_REFRESH_SECRET, {
    algorithm: "HS256",
    expiresIn: REFRESH_TOKEN_JWT_LIFETIME_SECONDS,
    notBefore: 0
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }) as AccessTokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Access token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid access token");
    }
    throw error;
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }) as RefreshTokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error("Refresh token expired");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error("Invalid refresh token");
    }
    throw error;
  }
};
