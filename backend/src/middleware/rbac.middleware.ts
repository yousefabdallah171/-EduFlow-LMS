import type { NextFunction, Request, Response } from "express";
import { ROLES, type Role } from "../constants/index.js";

export const requireRole =
  (...roles: Role[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "UNAUTHORIZED" });
      return;
    }

    if (!roles.includes(req.user.role as Role)) {
      res.status(403).json({ error: "FORBIDDEN" });
      return;
    }

    next();
  };
