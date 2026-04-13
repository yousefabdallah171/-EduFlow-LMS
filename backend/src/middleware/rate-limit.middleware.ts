import rateLimit from "express-rate-limit";

export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false
});

export const paymentRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === "production" ? 20 : 1000,
  standardHeaders: true,
  legacyHeaders: false
});
