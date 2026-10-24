import { Response, NextFunction } from "express";
import { sendError } from "../utils/httpError";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { StockOutputService } from "../services/stockOutputService";

export class StockOutputController {
  async findById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
    const id = Number(req.params.id);
    if (!/^[1-9]\d*$/.test(req.params.id) || !Number.isSafeInteger(id)) {
      return res.status(400).json({ error: "Informe um ID inteiro positivo." });
    }
    try {
      return res.json(await this.stockOutputService.findById(req.user.companyId, id));
    } catch (error) {
      return next(error);
    }
  }

  private stockOutputService = new StockOutputService();

  async findAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const stockOutputs = await this.stockOutputService.findAll(req.user.companyId);
      return res.status(200).json(stockOutputs);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  async output(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const newStockOutput: any = req.body;

      if (!newStockOutput || Object.keys(newStockOutput).length === 0) {
        return res.status(400).json({ error: "Request body is required" });
      }

      const stockOutput = await this.stockOutputService.output({ companyId: req.user.companyId, userId: req.user.userId }, newStockOutput);
      return res.status(201).json(stockOutput);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  async reverse(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "Informe um ID inteiro positivo." });
      const result = await this.stockOutputService.reverse({ companyId: req.user.companyId, userId: req.user.userId }, id);
      return res.status(201).json(result);
    } catch (error: any) {
      return sendError(res, error, "Não foi possível estornar a saída. Nada foi alterado.");
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const id: number = Number(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID parameter" });
      }

      const result = await this.stockOutputService.delete(req.user.companyId, id);
      return res.status(200).json(result);
    } catch (error: any) {
      return sendError(res, error);
    }
  }
}
