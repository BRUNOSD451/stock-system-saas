import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { NotificationService } from "../services/notificationService";
import { sendError } from "../utils/httpError";

export class NotificationController {
  private notificationService = new NotificationService();

  async findByUserId(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      // A identidade vem do token validado, nunca de um ID informado no corpo da requisição.
      const notifications = await this.notificationService.findByUserId(req.user.companyId, req.user.userId);
      return res.status(200).json(notifications);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  async markAsRead(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      await this.notificationService.markAsReadByUserId(req.user.companyId, req.user.userId);
      return res.status(204).send();
    } catch (error: any) {
      return sendError(res, error);
    }
  }
}
