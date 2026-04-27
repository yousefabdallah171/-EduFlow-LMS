import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { isValidPaymobHmac } from "../utils/hmac.js";

export const validatePaymobHmac = (req: Request, res: Response, next: NextFunction): void => {
  const providedHmac = String(req.query.hmac ?? req.body?.hmac ?? "");

  if (!providedHmac || !isValidPaymobHmac(req.body, providedHmac, env.PAYMOB_HMAC_SECRET)) {
    res.status(400).json({
      error: "INVALID_HMAC",
      message: "Webhook signature verification failed."
    });
    return;
  }

  next();
};
