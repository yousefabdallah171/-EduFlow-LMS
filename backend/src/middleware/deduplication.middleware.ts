import type { NextFunction, Request, Response } from "express";

type CapturedResponse = {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  mode: "json" | "send";
};

const inFlight = new Map<string, Promise<CapturedResponse>>();

const defaultKey = (req: Request) => {
  const userId = (req as Request & { user?: { userId?: string } }).user?.userId ?? "anon";
  return `${userId}:${req.method}:${req.originalUrl}`;
};

export const deduplicationMiddleware = (options?: {
  key?: (req: Request) => string | null;
  maxBodyBytes?: number;
}) => {
  const maxBodyBytes = options?.maxBodyBytes ?? 1_000_000;

  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET") return next();

    const key = (options?.key ?? defaultKey)(req);
    if (!key) return next();

    const existing = inFlight.get(key);
    if (existing) {
      void existing
        .then((captured) => {
          for (const [name, value] of Object.entries(captured.headers)) {
            res.setHeader(name, value);
          }
          res.status(captured.status);
          if (captured.mode === "json") {
            res.json(captured.body);
            return;
          }
          res.send(captured.body as never);
        })
        .catch(next);
      return;
    }

    let resolvePromise: (value: CapturedResponse) => void;
    let rejectPromise: (reason?: unknown) => void;

    const promise = new Promise<CapturedResponse>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    inFlight.set(key, promise);

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    let captured: CapturedResponse | null = null;
    let settled = false;

    res.json = ((body: unknown) => {
      const bytes = Buffer.byteLength(JSON.stringify(body ?? null), "utf8");
      if (bytes <= maxBodyBytes) {
        captured = {
          status: res.statusCode,
          headers: { "content-type": "application/json; charset=utf-8" },
          body,
          mode: "json"
        };
      }
      return originalJson(body as never);
    }) as typeof res.json;

    res.send = ((body: unknown) => {
      let size = 0;
      if (typeof body === "string") size = Buffer.byteLength(body, "utf8");
      else if (Buffer.isBuffer(body)) size = body.length;

      if (size <= maxBodyBytes) {
        const contentType = String(res.getHeader("content-type") ?? "");
        captured = {
          status: res.statusCode,
          headers: contentType ? { "content-type": contentType } : {},
          body,
          mode: "send"
        };
      }

      return originalSend(body as never);
    }) as typeof res.send;

    const finalize = () => {
      inFlight.delete(key);
      if (settled) return;
      settled = true;
      if (captured) {
        resolvePromise(captured);
      } else {
        resolvePromise({
          status: res.statusCode,
          headers: {},
          body: null,
          mode: "json"
        });
      }
    };

    res.on("finish", finalize);
    res.on("close", () => {
      inFlight.delete(key);

      // Never reject here: the app treats unhandled rejections as fatal.
      // If the client disconnects early, just resolve a minimal placeholder so any
      // concurrent awaiters can proceed without crashing the process.
      if (!settled) {
        settled = true;
        resolvePromise({
          status: res.statusCode || 499,
          headers: {},
          body: null,
          mode: "json"
        });
      }
    });

    next();
  };
};

