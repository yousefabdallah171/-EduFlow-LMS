import type { NextFunction, Request, Response } from "express";

import { verifyAccessToken } from "../utils/jwt.js";

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }

  try {
    const token = authorization.replace("Bearer ", "");
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ error: "INVALID_ACCESS_TOKEN" });
  }
};
