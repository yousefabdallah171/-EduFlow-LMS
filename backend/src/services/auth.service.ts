import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { User } from "@prisma/client";

import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { videoTokenService } from "./video-token.service.js";
import { sessionService } from "./session.service.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "../utils/email.js";
import {
  REFRESH_SESSION_WINDOW_MS,
  REFRESH_SESSION_WINDOW_SECONDS,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} from "../utils/jwt.js";

export class AuthError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN" | "STUDENT";
  locale: "en" | "ar";
  theme: "light" | "dark";
  avatarUrl: string | null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const hashToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");

const randomToken = (): string => crypto.randomBytes(32).toString("hex");

const toAuthUser = (user: User): AuthUser => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  locale: user.locale,
  theme: user.theme,
  avatarUrl: user.avatarUrl
});

const getRefreshExpiry = () => new Date(Date.now() + REFRESH_SESSION_WINDOW_MS);

const verificationUrl = (token: string) => `${env.FRONTEND_URL}/verify-email?token=${token}`;

const resetUrl = (token: string) => `${env.FRONTEND_URL}/reset-password?token=${token}`;
const sessionCacheKey = (userId: string, sessionId: string) => `session:${userId}:${sessionId}`;
const refreshCurrentCacheKey = (userId: string, sessionId: string) => `refresh-current:${userId}:${sessionId}`;

const issueAccessToken = (user: User, sessionId: string) =>
  signAccessToken({
    userId: user.id,
    role: user.role,
    sessionId
  });

const issueSession = async (user: User, sessionId: string = crypto.randomUUID(), familyId: string = crypto.randomUUID()) => {
  const tokenId = crypto.randomUUID();
  const accessToken = issueAccessToken(user, sessionId);
  const refreshToken = signRefreshToken({
    userId: user.id,
    role: user.role,
    sessionId,
    familyId,
    tokenId
  });
  const refreshTokenHash = hashToken(refreshToken);

  await refreshTokenRepository.create({
    user: { connect: { id: user.id } },
    tokenHash: refreshTokenHash,
    familyId,
    sessionId,
    expiresAt: getRefreshExpiry()
  });

  await redis.set(sessionCacheKey(user.id, sessionId), "active", "EX", REFRESH_SESSION_WINDOW_SECONDS);
  await redis.set(refreshCurrentCacheKey(user.id, sessionId), refreshTokenHash, "EX", REFRESH_SESSION_WINDOW_SECONDS);
  await sessionService.setActiveSession(user.id, sessionId, REFRESH_SESSION_WINDOW_SECONDS);

  return {
    accessToken,
    refreshToken,
    user: toAuthUser(user)
  };
};

export const authService = {
  async register(input: { email: string; password: string; fullName: string }) {
    const email = normalizeEmail(input.email);
    const existingUser = await userRepository.findByEmail(email);

    if (existingUser) {
      throw new AuthError("EMAIL_EXISTS", 409, "This email is already registered.");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const emailVerifyToken = randomToken();
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const isDevMode = env.NODE_ENV === "development";

    const user = await userRepository.create({
      email,
      fullName: input.fullName.trim(),
      passwordHash,
      emailVerified: isDevMode,
      emailVerifyToken: isDevMode ? null : emailVerifyToken,
      emailVerifyExpires: isDevMode ? null : emailVerifyExpires
    });

    if (!isDevMode) {
      await sendVerificationEmail(user.email, user.fullName, verificationUrl(emailVerifyToken));
    }

    return {
      message: isDevMode
        ? "Registration successful. You can now log in."
        : "Registration successful. Please check your email to verify your account.",
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName
      }
    };
  },

  async login(input: { email: string; password: string }) {
    const user = await userRepository.findByEmail(normalizeEmail(input.email));

    if (!user?.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new AuthError("INVALID_CREDENTIALS", 401, "Email or password is incorrect.");
    }

    if (!user.emailVerified) {
      throw new AuthError("EMAIL_NOT_VERIFIED", 403, "Please verify your email address before logging in.");
    }

    return issueSession(user);
  },

  async refresh(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) {
      throw new AuthError("INVALID_REFRESH_TOKEN", 401, "Invalid refresh token.");
    }

    let payload: ReturnType<typeof verifyRefreshToken>;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new AuthError("INVALID_REFRESH_TOKEN", 401, "Invalid refresh token.");
    }

    const tokenHash = hashToken(rawRefreshToken);
    const storedToken = await refreshTokenRepository.findByHash(tokenHash);

    if (!storedToken || storedToken.expiresAt <= new Date()) {
      throw new AuthError("INVALID_REFRESH_TOKEN", 401, "Invalid refresh token.");
    }

    if (storedToken.revokedAt) {
      await refreshTokenRepository.revokeByFamily(storedToken.familyId);
      await redis.del(sessionCacheKey(payload.userId, payload.sessionId));
      await redis.del(refreshCurrentCacheKey(payload.userId, payload.sessionId));
      throw new AuthError("TOKEN_REUSE_DETECTED", 403, "Security alert: please log in again.");
    }

    const user = await userRepository.findById(payload.userId);
    if (!user) {
      throw new AuthError("INVALID_REFRESH_TOKEN", 401, "Invalid refresh token.");
    }

    if (env.ENFORCE_SINGLE_SESSION) {
      const ok = await sessionService.ensureActiveSession(payload.userId, payload.sessionId, REFRESH_SESSION_WINDOW_SECONDS);
      if (!ok) {
        await refreshTokenRepository.revokeBySession(payload.userId, payload.sessionId);
        await redis.del(sessionCacheKey(payload.userId, payload.sessionId));
        await redis.del(refreshCurrentCacheKey(payload.userId, payload.sessionId));
        await videoTokenService.revokeSession(payload.userId, payload.sessionId);
        throw new AuthError("SESSION_INVALIDATED", 401, "Session has been invalidated. Please log in again.");
      }
    }

    await refreshTokenRepository.revokeByHash(tokenHash);

    return issueSession(user, payload.sessionId, storedToken.familyId);
  },

  async logout(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) {
      return;
    }

    let payload: ReturnType<typeof verifyRefreshToken> | null = null;
    try {
      payload = verifyRefreshToken(rawRefreshToken);
    } catch {
      payload = null;
    }

    const tokenHash = hashToken(rawRefreshToken);
    const storedToken = await refreshTokenRepository.findByHash(tokenHash);

    if (storedToken && !storedToken.revokedAt) {
      await refreshTokenRepository.revokeByHash(tokenHash);
    }

    if (payload) {
      await redis.del(sessionCacheKey(payload.userId, payload.sessionId));
      await redis.del(refreshCurrentCacheKey(payload.userId, payload.sessionId));
      await videoTokenService.revokeSession(payload.userId, payload.sessionId);
      if (env.ENFORCE_SINGLE_SESSION) {
        await sessionService.invalidateIfActive(payload.userId, payload.sessionId);
      }
    }
  },

  async verifyEmail(token: string | undefined) {
    if (!token) {
      throw new AuthError("INVALID_OR_EXPIRED_TOKEN", 400, "Invalid or expired token.");
    }

    const user = await userRepository.findByEmailVerifyToken(token);
    if (!user || !user.emailVerifyExpires || user.emailVerifyExpires <= new Date()) {
      throw new AuthError("INVALID_OR_EXPIRED_TOKEN", 400, "Invalid or expired token.");
    }

    await userRepository.update(user.id, {
      emailVerified: true,
      emailVerifyToken: null,
      emailVerifyExpires: null
    });

    return { message: "Email verified. You can now log in." };
  },

  async forgotPassword(emailInput: string) {
    const user = await userRepository.findByEmail(normalizeEmail(emailInput));

    if (user) {
      const passwordResetToken = randomToken();
      const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);

      await userRepository.update(user.id, {
        passwordResetToken,
        passwordResetExpires
      });
      await sendPasswordResetEmail(user.email, user.fullName, resetUrl(passwordResetToken));
    }

    return { message: "If that email is registered, a reset link has been sent." };
  },

  async resetPassword(token: string | undefined, password: string) {
    if (!token) {
      throw new AuthError("INVALID_OR_EXPIRED_TOKEN", 400, "Invalid or expired token.");
    }

    const user = await userRepository.findByPasswordResetToken(token);
    if (!user || !user.passwordResetExpires || user.passwordResetExpires <= new Date()) {
      throw new AuthError("INVALID_OR_EXPIRED_TOKEN", 400, "Invalid or expired token.");
    }

    await userRepository.update(user.id, {
      passwordHash: await bcrypt.hash(password, 12),
      passwordResetToken: null,
      passwordResetExpires: null
    });

    return { message: "Password updated successfully. Please log in." };
  },

  async getOrCreateGoogleUser(profile: {
    id: string;
    emails?: Array<{ value: string }>;
    displayName?: string;
    photos?: Array<{ value: string }>;
  }) {
    const email = normalizeEmail(profile.emails?.[0]?.value ?? "");
    if (!email) {
      throw new AuthError("OAUTH_EMAIL_REQUIRED", 422, "Google account email is required.");
    }

    const byOAuth = await userRepository.findByOAuthId(profile.id);
    if (byOAuth) return byOAuth;

    const byEmail = await userRepository.findByEmail(email);
    if (byEmail) {
      return userRepository.update(byEmail.id, {
        oauthProvider: "google",
        oauthId: profile.id,
        emailVerified: true,
        avatarUrl: profile.photos?.[0]?.value ?? byEmail.avatarUrl
      });
    }

    return userRepository.create({
      email,
      fullName: profile.displayName ?? email,
      avatarUrl: profile.photos?.[0]?.value,
      oauthProvider: "google",
      oauthId: profile.id,
      emailVerified: true
    });
  },

  issueSessionForUser(user: User) {
    return issueSession(user);
  }
};
