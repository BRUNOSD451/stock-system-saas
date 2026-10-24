import { Response } from "express";
import { sendError } from "../utils/httpError";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { ProductsService } from "../services/productsServices";
import { uploadImage } from "../database/cloudinary";

export class ProductsController {
  private productsService = new ProductsService();

  async findAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const products = await this.productsService.findAll(req.user.companyId);
      return res.status(200).json(products);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const newProduct: any = req.body;

      if (newProduct.description === "") newProduct.description = null;
      if (newProduct.supplierId === "") newProduct.supplierId = null;

      if (req.file) {
        const image = await uploadImage(req.file.buffer, req.file.originalname);
        newProduct.imageUrl = image.secure_url;
      }

      if (!newProduct || Object.keys(newProduct).length === 0) {
        return res.status(400).json({ error: "Request body is required" });
      }

      const produtos = await this.productsService.create(req.user.companyId, newProduct);
      return res.status(201).json(produtos);
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

      const produtos = await this.productsService.delete(req.user.companyId, id);
      return res.status(200).json(produtos);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  async setActive(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "Informe um ID inteiro positivo." });
      return res.status(200).json(await this.productsService.setActive(req.user.companyId, id, req.body?.active));
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  // Ajuste de inventário: o responsável é quem está logado.
  async adjust(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "Informe um ID inteiro positivo." });
      const result = await this.productsService.adjust({ companyId: req.user.companyId, userId: req.user.userId }, id, req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      return sendError(res, error, "Não foi possível registrar o ajuste. Nada foi alterado.");
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

      if (updateData.description === "") updateData.description = null;
      if (updateData.supplierId === "") updateData.supplierId = null;

      if (req.file) {
        const image = await uploadImage(req.file.buffer, req.file.originalname);
        updateData.imageUrl = image.secure_url;
      }

      if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "Request body is required" });
      }

      const product = await this.productsService.update(req.user.companyId, updateData, id);
      return res.status(200).json(product);
    } catch (error: any) {
      return sendError(res, error);
    }
  }
}
