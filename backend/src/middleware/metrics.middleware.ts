import type { Request, Response, NextFunction } from "express";
import { metricsService } from "../services/metrics.service.js";

/**
 * Middleware to track API endpoint metrics
 */
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  res.send = function (data: unknown) {
    // Record metrics
    metricsService.recordApiRequest(
      req.path,
      req.method,
      res.statusCode
    );

    // Call original send
    return originalSend.call(this, data);
  };

  next();
};

export default metricsMiddleware;
