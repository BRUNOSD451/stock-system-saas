import { Request, Response } from "express";
import { sendError } from "../utils/httpError";
import { CompaniesService } from "../services/companiesService";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { uploadImage } from "../database/cloudinary";

export class CompaniesController {
  private companiesService = new CompaniesService();

  async signup(req: Request, res: Response) {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: "Request body is required" });
      }

      const result = await this.companiesService.signup(req.body);
      return res.status(201).json(result);
    } catch (error: any) {
      return sendError(res, error, "Não foi possível criar a conta. Tente novamente.");
    }
  }

  async getMine(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      return res.status(200).json(await this.companiesService.getMine(req.user.companyId));
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  async updateMine(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });

      // A logo de cada empresa fica numa pasta própria no Cloudinary.
      let logoUrl: string | undefined;
      if (req.file) {
        const image = await uploadImage(req.file.buffer, req.file.originalname, `stock-system/companies/${req.user.companyId}`);
        logoUrl = image.secure_url;
      }

      const company = await this.companiesService.updateMine(req.user.companyId, req.body, logoUrl);
      return res.status(200).json(company);
    } catch (error: any) {
      return sendError(res, error, "Não foi possível salvar os dados da empresa.");
    }
  }
}
