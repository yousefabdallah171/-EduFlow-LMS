import type { NextFunction, Request, Response } from "express";
import { dashboardService } from "../services/dashboard.service.js";

export const studentController = {
  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      res.json(await dashboardService.getStudentDashboard(userId));
    } catch (error) {
      next(error);
    }
  }
};
