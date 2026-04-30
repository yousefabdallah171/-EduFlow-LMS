import type { Request } from "express";

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_REGEX = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

const isValidIp = (ip: string): boolean => IPV4_REGEX.test(ip) || IPV6_REGEX.test(ip);

export const extractIp = (req: Request): string => {
  // Cloudflare: CF-Connecting-IP is the real visitor IP, always trust it first
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string" && isValidIp(cfIp)) {
    return cfIp;
  }

  const forwardedFor = req.headers["x-forwarded-for"];
  if (forwardedFor) {
    const first = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor).split(",")[0]?.trim();
    if (first && isValidIp(first)) {
      return first;
    }
  }

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && isValidIp(realIp)) {
    return realIp;
  }

  return req.socket?.remoteAddress ?? "0.0.0.0";
};
