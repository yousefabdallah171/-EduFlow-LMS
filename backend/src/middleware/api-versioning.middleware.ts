import type { NextFunction, Request, Response } from "express";

const CURRENT_VERSION = "1.0.0";
const DEPRECATED_VERSION = null; // Set to version number if deprecating current version
const SUNSET_DATE = null; // ISO date string when deprecated version will be removed

export interface VersionInfo {
  current: string;
  deprecated?: string;
  sunset?: string;
}

export const apiVersioningMiddleware = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("API-Version", CURRENT_VERSION);

  if (DEPRECATED_VERSION) {
    res.setHeader("API-Deprecated-Version", DEPRECATED_VERSION);
    if (SUNSET_DATE) {
      res.setHeader("Sunset", new Date(SUNSET_DATE).toUTCString());
      res.setHeader("Deprecation", "true");
    }
  }

  res.setHeader("API-Upgrade-Guide", "https://docs.example.com/api/versioning");

  next();
};

export const getVersionInfo = (): VersionInfo => {
  const info: VersionInfo = {
    current: CURRENT_VERSION
  };

  if (DEPRECATED_VERSION) {
    info.deprecated = DEPRECATED_VERSION;
  }

  if (SUNSET_DATE) {
    info.sunset = SUNSET_DATE;
  }

  return info;
};
