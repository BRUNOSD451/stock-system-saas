import { CategoriesService } from "../services/categoriesServices";
import { sendError } from "../utils/httpError";
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export class CategoriesController {
  private categoriesService = new CategoriesService();

  async findAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const categories = await this.categoriesService.findAll(req.user.companyId);
      return res.status(200).json(categories);
    } catch (error) {
      return sendError(res, error);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const id: number = Number(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID parameter" });
      }

      const categories = await this.categoriesService.delete(req.user.companyId, id);
      return res.status(200).json(categories);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const data: any = req.body;

      if (!data || Object.keys(data).length === 0) {
        return res.status(400).json({ error: "Request body is required" });
      }

      const categories = await this.categoriesService.create(req.user.companyId, data);
      return res.status(201).json(categories);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const id: number = Number(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID parameter" });
      }

      const updateData: any = req.body;

      if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "Request body is required" });
      }

      const category = await this.categoriesService.update(req.user.companyId, updateData, id);
      return res.status(200).json(category);
    } catch (error: any) {
      return sendError(res, error);
    }
  }
}
