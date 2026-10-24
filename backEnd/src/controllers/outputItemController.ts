import { Response } from "express";
import { sendError } from "../utils/httpError";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { OutputItemService } from "../services/outputItemService";

export class OutputItemController {
  private outputItemService = new OutputItemService();

  async findAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const outputItems = await this.outputItemService.findAll(req.user.companyId);
      return res.status(200).json(outputItems);
    } catch (error: any) {
      return sendError(res, error);
    }
  }
}
