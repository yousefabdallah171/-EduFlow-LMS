import type { NextFunction, Request, Response } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      cache?: Map<string, unknown>;
    }
  }
}

export const requestCacheMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  req.cache = new Map<string, unknown>();
  next();
};
