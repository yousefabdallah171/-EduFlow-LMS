import type { NextFunction, Request, Response } from "express";

export const requireRole =
  (...roles: Array<"ADMIN" | "STUDENT">) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "FORBIDDEN" });
      return;
    }

    next();
  };
