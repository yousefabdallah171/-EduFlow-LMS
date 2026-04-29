import type { NextFunction, Request, Response } from "express";
import passport from "passport";
import { z } from "zod";
import type { User } from "@prisma/client";
import crypto from "node:crypto";

import { env } from "../config/env.js";
import { AuthError, authService } from "../services/auth.service.js";
import { whitelistService, protectionNotificationService, attemptCounterService, attemptLogService } from "../services/security/index.js";
import { REFRESH_SESSION_WINDOW_MS } from "../utils/jwt.js";
import { validateEmail } from "../utils/email-validation.js";
import { extractIp } from "../utils/ip-extractor.js";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const emailSchema = z.string().max(255).refine(validateEmail, "Invalid email format");

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1, "Full name is required").max(100)
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required")
});

const forgotPasswordSchema = z.object({
  email: emailSchema
});

const resendVerificationSchema = z.object({
  email: emailSchema
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema
});

const acknowledgeSchema = z.object({
  token: z.string().min(1)
});

const isHttpsRequest = (req: Request) =>
  req.secure || req.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https";

const shouldUseSecureCookie = (req: Request) => {
  if (isHttpsRequest(req)) {
    return true;
  }

  try {
    return new URL(env.FRONTEND_URL).protocol === "https:";
  } catch {
    return env.NODE_ENV === "production";
  }
};

const getRefreshCookieOptions = (req: Request) => ({
  httpOnly: true,
  secure: shouldUseSecureCookie(req),
  sameSite: "strict" as const,
  path: "/api/v1",
  maxAge: REFRESH_SESSION_WINDOW_MS
});

const getRefreshMarkerCookieOptions = (req: Request) => ({
  httpOnly: false,
  secure: shouldUseSecureCookie(req),
  sameSite: "strict" as const,
  path: "/",
  maxAge: REFRESH_SESSION_WINDOW_MS
});

const GOOGLE_OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

const getGoogleOauthStateCookieOptions = (req: Request) => ({
  httpOnly: true,
  secure: shouldUseSecureCookie(req),
  // OAuth callback is a top-level navigation from google.com -> our domain, so Strict would block the cookie.
  sameSite: "lax" as const,
  path: "/api/v1/auth/oauth/google",
  maxAge: GOOGLE_OAUTH_STATE_TTL_MS
});

const setGoogleOauthStateCookie = (req: Request, res: Response, value: string) => {
  res.cookie("google_oauth_state", value, getGoogleOauthStateCookieOptions(req));
};

const clearGoogleOauthStateCookie = (req: Request, res: Response) => {
  res.clearCookie("google_oauth_state", {
    ...getGoogleOauthStateCookieOptions(req),
    maxAge: undefined
  });
};

const setRefreshCookie = (req: Request, res: Response, refreshToken: string) => {
  res.cookie("refresh_token", refreshToken, getRefreshCookieOptions(req));
  res.cookie("eduflow_refresh_present", "1", getRefreshMarkerCookieOptions(req));
};

const clearRefreshCookie = (req: Request, res: Response) => {
  res.clearCookie("refresh_token", {
    ...getRefreshCookieOptions(req),
    maxAge: undefined
  });
  res.clearCookie("eduflow_refresh_present", {
    ...getRefreshMarkerCookieOptions(req),
    maxAge: undefined
  });
};

const validationError = (error: z.ZodError) => {
  const fields = Object.fromEntries(error.issues.map((issue) => [issue.path.join("."), issue.message]));
  return {
    error: "VALIDATION_ERROR",
    fields
  };
};

const handleError = (error: unknown, res: Response, next: NextFunction) => {
  if (error instanceof z.ZodError) {
    res.status(422).json(validationError(error));
    return;
  }

  if (error instanceof AuthError) {
    res.status(error.status).json({
      error: error.code,
      message: error.message
    });
    return;
  }

  next(error);
};

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const body = registerSchema.parse(req.body);
      const result = await authService.register(body);
      res.status(201).json(result);
    } catch (error) {
      handleError(error, res, next);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = loginSchema.parse(req.body);
      const result = await authService.login(body);
      if (result.user.role === "ADMIN") {
        const adminIp = extractIp(req);
        await whitelistService.add(adminIp, result.user.id, "Admin auto-whitelist").catch(() => undefined);
      }
      setRefreshCookie(req, res, result.refreshToken);
      res.json({
        accessToken: result.accessToken,
        user: result.user
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.refresh(req.cookies.refresh_token as string | undefined);
      setRefreshCookie(req, res, result.refreshToken);
      res.json({
        accessToken: result.accessToken,
        user: result.user
      });
    } catch (error) {
      if (
        error instanceof AuthError &&
        (error.code === "TOKEN_REUSE_DETECTED" || error.code === "INVALID_REFRESH_TOKEN")
      ) {
        clearRefreshCookie(req, res);
      }
      handleError(error, res, next);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.cookies.refresh_token as string | undefined);
      clearRefreshCookie(req, res);
      res.json({ message: "Logged out successfully." });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const body = forgotPasswordSchema.parse(req.body);
      res.json(await authService.forgotPassword(body.email));
    } catch (error) {
      handleError(error, res, next);
    }
  },

  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      const body = resendVerificationSchema.parse(req.body);
      res.json(await authService.resendVerificationEmail(body.email));
    } catch (error) {
      handleError(error, res, next);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const body = resetPasswordSchema.parse(req.body);
      res.json(await authService.resetPassword(body.token, body.password));
    } catch (error) {
      handleError(error, res, next);
    }
  },

  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(await authService.verifyEmail(req.query.token as string | undefined));
    } catch (error) {
      handleError(error, res, next);
    }
  },

  async acknowledgeSecurity(req: Request, res: Response, next: NextFunction) {
    try {
      const body = acknowledgeSchema.parse(req.body);
      const parsed = protectionNotificationService.verifyAcknowledgeToken(body.token);
      if (!parsed) {
        res.status(400).json({ error: "INVALID_OR_EXPIRED_TOKEN" });
        return;
      }

      if (parsed.type === "was-me") {
        await attemptCounterService.reset("email", parsed.email, 0);
      }

      attemptLogService.log({
        type: "LOGIN",
        result: "SUCCESS",
        ipAddress: extractIp(req),
        emailAttempted: parsed.email,
        metadata: { acknowledgeType: parsed.type }
      });

      res.json({
        success: true,
        type: parsed.type,
        promptPasswordChange: parsed.type === "was-not-me"
      });
    } catch (error) {
      handleError(error, res, next);
    }
  },

  googleStart(req: Request, res: Response, next: NextFunction) {
    const state = crypto.randomBytes(24).toString("hex");
    setGoogleOauthStateCookie(req, res, state);
    passport.authenticate("google", { scope: ["profile", "email"], state, session: false })(req, res, next);
  },

  googleCallback(req: Request, res: Response, next: NextFunction) {
    const cookieState = typeof req.cookies?.google_oauth_state === "string" ? req.cookies.google_oauth_state : null;
    const queryState = typeof req.query?.state === "string" ? req.query.state : null;
    clearGoogleOauthStateCookie(req, res);
    if (!cookieState || !queryState || cookieState !== queryState) {
      handleError(new AuthError("OAUTH_STATE_MISMATCH", 401, "Invalid OAuth state."), res, next);
      return;
    }

    passport.authenticate("google", { session: false }, async (error: unknown, user?: User) => {
      try {
        if (error) throw error;
        if (!user) {
          throw new AuthError("OAUTH_FAILED", 401, "Google authentication failed.");
        }

        const result = await authService.issueSessionForUser(user);
        setRefreshCookie(req, res, result.refreshToken);
        res.redirect(`${env.FRONTEND_URL}/auth/callback`);
      } catch (authError) {
        handleError(authError, res, next);
      }
    })(req, res, next);
  }
};
