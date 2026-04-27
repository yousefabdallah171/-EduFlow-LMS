export const BRAND_CONSTANTS = {
  // Course/Platform names
  COURSE_NAME: process.env.COURSE_NAME || "EduFlow",
  COURSE_NAME_FULL: process.env.COURSE_NAME_FULL || "EduFlow LMS: From Idea to Production",
  COURSE_NAME_EN: process.env.COURSE_NAME_EN || "EduFlow",
  COURSE_NAME_AR: process.env.COURSE_NAME_AR || "إيدوفلو",

  // Brand styling
  PRIMARY_COLOR: process.env.PRIMARY_COLOR || "#a3e635",
  ACCENT_COLOR: process.env.ACCENT_COLOR || "#38bdf8",

  // Support contact
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || "support@eduflow.com",
  SUPPORT_PHONE: process.env.SUPPORT_PHONE,
  SUPPORT_URL: process.env.SUPPORT_URL,

  // Branding
  YEAR: new Date().getFullYear()
};

export const API_CONSTANTS = {
  MAX_TOKEN_LENGTH: 2048,
  MAX_UPLOAD_MB: 4096,
  MAX_FILENAME_LENGTH: 255,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};

export const TIME_CONSTANTS = {
  JWT_EXPIRY_HOURS: 24,
  REFRESH_TOKEN_EXPIRY_DAYS: 30,
  VERIFICATION_LINK_EXPIRY_HOURS: 24,
  PASSWORD_RESET_LINK_EXPIRY_HOURS: 1,
  GOOGLE_OAUTH_STATE_TTL_MS: 10 * 60 * 1000,
  FFMPEG_TIMEOUT_MS: 30 * 60 * 1000
};
