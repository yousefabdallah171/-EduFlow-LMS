import type { NextFunction, Request, Response } from "express";
import passport from "passport";
import { z } from "zod";
import type { User } from "@prisma/client";

import { env } from "../config/env.js";
import { AuthError, authService } from "../services/auth.service.js";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const registerSchema = z.object({
  email: z.string().email("Invalid email format").max(255),
  password: passwordSchema,
  fullName: z.string().trim().min(1, "Full name is required").max(100)
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required")
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format")
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema
});

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/api/v1",
  maxAge: 7 * 24 * 60 * 60 * 1000
};

const setRefreshCookie = (res: Response, refreshToken: string) => {
  res.cookie("refresh_token", refreshToken, refreshCookieOptions);
};

const clearRefreshCookie = (res: Response) => {
  res.clearCookie("refresh_token", {
    ...refreshCookieOptions,
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
      setRefreshCookie(res, result.refreshToken);
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
      setRefreshCookie(res, result.refreshToken);
      res.json({
        accessToken: result.accessToken,
        user: result.user
      });
    } catch (error) {
      if (error instanceof AuthError && error.code === "TOKEN_REUSE_DETECTED") {
        clearRefreshCookie(res);
      }
      handleError(error, res, next);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.cookies.refresh_token as string | undefined);
      clearRefreshCookie(res);
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

  googleStart: passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false
  }),

  googleCallback(req: Request, res: Response, next: NextFunction) {
    passport.authenticate("google", { session: false }, async (error: unknown, user?: User) => {
      try {
        if (error) throw error;
        if (!user) {
          throw new AuthError("OAUTH_FAILED", 401, "Google authentication failed.");
        }

        const result = await authService.issueSessionForUser(user);
        setRefreshCookie(res, result.refreshToken);
        res.redirect(`${env.FRONTEND_URL}/auth/callback`);
      } catch (authError) {
        handleError(authError, res, next);
      }
    })(req, res, next);
  }
};
