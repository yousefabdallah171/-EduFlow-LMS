import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { sessionService } from "../services/session.service.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { REFRESH_SESSION_WINDOW_SECONDS } from "../utils/jwt.js";

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }

  try {
    const token = authorization.replace("Bearer ", "");
    const user = verifyAccessToken(token);

    if (env.ENFORCE_SINGLE_SESSION) {
      const ok = await sessionService.ensureActiveSession(user.userId, user.sessionId, REFRESH_SESSION_WINDOW_SECONDS);
      if (!ok) {
        res.status(401).json({ error: "SESSION_INVALIDATED" });
        return;
      }
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "INVALID_ACCESS_TOKEN" });
  }
};
