import { Response } from "express";
import { sendError } from "../utils/httpError";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { InputItemService } from "../services/inputItemService";

export class InputItemController {
  private inputItemService = new InputItemService();

  async findAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const inputItems = await this.inputItemService.findAll(req.user.companyId);
      return res.status(200).json(inputItems);
    } catch (error: any) {
      return sendError(res, error);
    }
  }
}
