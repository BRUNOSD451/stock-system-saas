import { Response, NextFunction } from "express";
import { sendError } from "../utils/httpError";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { StockInputService } from "../services/stockInputService";

export class StockInputController {
  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
    const id = Number(req.params.id);
    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id)) {
      return res.status(400).json({ error: "Informe um ID inteiro positivo." });
    }
    try {
      return res.json(await this.stockInputService.findById(req.user.companyId, id));
    } catch (error) {
      return next(error);
    }
  }

  private stockInputService = new StockInputService();

  async findAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const stockInputs = await this.stockInputService.findAll(req.user.companyId);
      return res.status(200).json(stockInputs);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  async input(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const newStockInput: any = req.body;

      if (!newStockInput || Object.keys(newStockInput).length === 0) {
        return res.status(400).json({ error: "Request body is required" });
      }

      const stockInput = await this.stockInputService.input({ companyId: req.user.companyId, userId: req.user.userId }, newStockInput);
      return res.status(201).json(stockInput);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  async reverse(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "Informe um ID inteiro positivo." });
      const result = await this.stockInputService.reverse({ companyId: req.user.companyId, userId: req.user.userId }, id);
      return res.status(201).json(result);
    } catch (error: any) {
      return sendError(res, error, "Não foi possível estornar a entrada. Nada foi alterado.");
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const id: number = Number(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID parameter" });
      }

      const result = await this.stockInputService.delete(req.user.companyId, id);
      return res.status(200).json(result);
    } catch (error: any) {
      return sendError(res, error);
    }
  }
}
