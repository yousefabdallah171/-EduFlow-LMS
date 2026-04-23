import { Router } from "express";

import { contactController } from "../controllers/contact.controller.js";
import { contactRateLimit } from "../middleware/rate-limit.middleware.js";

const router = Router();

router.post("/contact", contactRateLimit, contactController.submit);

export { router as publicRoutes };
