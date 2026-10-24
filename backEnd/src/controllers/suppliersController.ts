import { SuppliersService } from "../services/suppliersServices";
import { sendError } from "../utils/httpError";
import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

export class SupplierController {
  private supplierService = new SuppliersService();

  async findAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const suppliers = await this.supplierService.findAll(req.user.companyId);
      return res.status(200).json(suppliers);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const newSupplier: any = req.body;

      if (!newSupplier || Object.keys(newSupplier).length === 0) {
        return res.status(400).json({ error: "Request body is required" });
      }

      const suppliers = await this.supplierService.create(req.user.companyId, newSupplier);
      return res.status(201).json(suppliers);
    } catch (error: any) {
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

      const suppliers = await this.supplierService.delete(req.user.companyId, id);
      return res.status(200).json(suppliers);
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

      const supplier = await this.supplierService.update(req.user.companyId, updateData, id);
      return res.status(200).json(supplier);
    } catch (error: any) {
      return sendError(res, error);
    }
  }
}
