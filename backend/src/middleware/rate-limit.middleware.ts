import rateLimit from "express-rate-limit";

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false
});

export const refreshRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 120 : 1000,
  standardHeaders: true,
  legacyHeaders: false
});

export const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 20 : 1000,
  standardHeaders: true,
  legacyHeaders: false
});

export const contactRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 5 : 1000,
  standardHeaders: true,
  legacyHeaders: false
});

export const videoIpRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 300 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || String(req.headers["x-forwarded-for"] || "unknown")
});

export const passwordChangeRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 3 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip || "unknown",
  message: { error: "TOO_MANY_PASSWORD_CHANGE_ATTEMPTS", message: "Too many password change attempts. Please try again later." }
});

export const adminSearchRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 50 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip || "unknown",
  message: { error: "TOO_MANY_SEARCH_REQUESTS", message: "Too many search requests. Please try again after 15 minutes." }
});

export const videoPreviewRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 30 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || String(req.headers["x-forwarded-for"] || "unknown")
});
