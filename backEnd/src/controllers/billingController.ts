import { Response } from "express";
import { sendError } from "../utils/httpError";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { BillingService } from "../services/billingService";

export class BillingController {
  private billingService = new BillingService();

  async getOverview(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json(await this.billingService.getOverview(req.user.companyId));
    } catch (error) {
      return sendError(res, error);
    }
  }

  async createCheckout(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      return res.status(200).json(await this.billingService.createCheckout(req.user.companyId));
    } catch (error) {
      return sendError(res, error, "Não foi possível iniciar a assinatura. Tente novamente.");
    }
  }

  async confirmSimulated(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      return res.status(200).json(await this.billingService.confirmSimulated(req.user.companyId));
    } catch (error) {
      return sendError(res, error);
    }
  }
}
