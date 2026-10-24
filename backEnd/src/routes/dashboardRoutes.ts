import { Router } from "express";
import { dashboardController } from "../controllers/dashboardController";
import { requireAdmin } from "../middlewares/requireAdmin";

const DashboardRouter = Router();
// A tela de Dashboard é exclusiva do administrador.
DashboardRouter.get("/", requireAdmin, (req, res, next) =>
  dashboardController.getDataDashboard(req, res, next)
);

export default DashboardRouter;
