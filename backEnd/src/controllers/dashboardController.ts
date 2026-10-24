import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { dashboardService } from "../services/dashboardService";

class DashboardController {
  async getDataDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
    try {
      return res.status(200).json(await dashboardService.getDataDashboard(req.user.companyId));
    } catch (error) {
      return next(error);
    }
  }
}

export const dashboardController = new DashboardController();
