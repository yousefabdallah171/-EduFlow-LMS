import jwt from "jsonwebtoken";

import { env } from "../config/env.js";

type BasePayload = {
  userId: string;
  role: "ADMIN" | "STUDENT";
  sessionId: string;
};

export type AccessTokenPayload = BasePayload;
export type RefreshTokenPayload = BasePayload & { familyId: string; tokenId: string };

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { algorithm: "HS256", expiresIn: "15m" });

export const signRefreshToken = (payload: RefreshTokenPayload): string =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, { algorithm: "HS256", expiresIn: "7d" });

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
