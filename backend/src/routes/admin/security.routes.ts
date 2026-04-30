import { Router } from "express";

import { securityController } from "../../controllers/admin/security.controller.js";

const router = Router();

router.get("/security/logs", securityController.listLogs);
router.get("/security/stats", securityController.getStats);
router.get("/security/bans", securityController.listBans);
router.post("/security/bans", securityController.createBan);
router.delete("/security/bans/:id", securityController.liftBan);
router.patch("/security/bans/:id", securityController.extendBan);
router.get("/security/whitelist", securityController.listWhitelist);
router.post("/security/whitelist", securityController.addWhitelist);
router.delete("/security/whitelist/:id", securityController.removeWhitelist);

export { router as adminSecurityRoutes };
