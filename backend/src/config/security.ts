import type { CorsOptions } from "cors";
import type { HelmetOptions } from "helmet";
import { env } from "./env.js";

export const corsConfig: CorsOptions = {
  origin: env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Total-Count", "X-Page-Count", "RateLimit-Limit", "RateLimit-Remaining"],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
};

export const helmetConfig: HelmetOptions = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", env.FRONTEND_URL],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      ...(env.NODE_ENV === "production" ? { upgradeInsecureRequests: null } : {})
    },
    reportUri: undefined,
    useDefaults: true
  },
  // Disable framebrowser clickjacking attacks
  frameguard: {
    action: "deny"
  },
  // Prevent browsers from MIME-sniffing
  noSniff: true,
  // Enable XSS filter in older browsers
  xssFilter: true,
  // Referrer policy
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin"
  },
  // Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: env.NODE_ENV === "production"
  },
  // Prevent DNS prefetching
  dnsPrefetchControl: {
    allow: false
  },
  // Remove X-Powered-By header
  hidePoweredBy: true,
  // Permissions policy (formerly Feature-Policy)
  permissionsPolicy: {
    geolocation: [],
    microphone: [],
    camera: [],
    payment: [],
    usb: [],
    magnetometer: [],
    gyroscope: [],
    accelerometer: []
  }
};
