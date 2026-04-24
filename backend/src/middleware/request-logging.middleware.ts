import type { NextFunction, Request, Response } from "express";

export interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  statusCode?: number;
  duration: number;
  ip: string;
  userAgent?: string;
  userId?: string;
  error?: string;
}

const formatRequestLog = (log: RequestLog): string => {
  return JSON.stringify({
    timestamp: log.timestamp,
    method: log.method,
    path: log.path,
    status: log.statusCode || "pending",
    duration_ms: log.duration,
    ip: log.ip,
    user_id: log.userId || "anonymous",
    user_agent: log.userAgent ? log.userAgent.substring(0, 100) : undefined,
    error: log.error
  });
};

export const requestLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    const log: RequestLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip || "unknown",
      userAgent: req.get("user-agent"),
      userId: req.user?.userId
    };

    // Only log errors and slower requests
    const isError = res.statusCode >= 400;
    const isSlow = duration > 5000; // 5 seconds
    const isAuth = req.path.includes("/auth");

    if (isError || isSlow || isAuth) {
      console.log(formatRequestLog(log));
    }
  });

  res.on("error", (err: Error) => {
    const duration = Date.now() - startTime;

    const log: RequestLog = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: 500,
      duration,
      ip: req.ip || "unknown",
      userAgent: req.get("user-agent"),
      userId: req.user?.userId,
      error: err.message
    };

    console.error(formatRequestLog(log));
  });

  next();
};
