import { Request, Response } from "express";
import { sendError } from "../utils/httpError";
import { UserService } from "../services/userService";
import { uploadImage } from "../database/cloudinary";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
export class UserController {
  async updateImage(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      if (!req.file) return res.status(400).json({ error: "Selecione uma imagem." });
      const image = await uploadImage(req.file.buffer, req.file.originalname, "stock-system/users");
      const user = await this.userService.update(req.user.companyId, { imageUrl: image.secure_url }, req.user.userId);
      return res.status(200).json(user);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  private userService = new UserService();

  async getAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const users = await this.userService.findAll(req.user.companyId);
      return res.status(200).json(users);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const newuser = req.body;

      if (!newuser || Object.keys(newuser).length === 0) {
        return res.status(400).json({ error: "Request body is required" });
      }

      if (req.file) {
        const image = await uploadImage(req.file.buffer, req.file.originalname, "stock-system/users");
        newuser.imageUrl = image.secure_url;
      }
      const user = await this.userService.create(req.user.companyId, newuser);
      return res.status(201).json(user);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  // Nova senha provisória para alguém da equipe; mostrada uma única vez ao administrador.
  async resetPassword(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const id: number = Number(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid ID parameter" });
      }

      const result = await this.userService.resetPassword(req.user.companyId, req.user.userId, id);
      return res.status(200).json(result);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

  // A própria pessoa troca a senha (inclusive a provisória do primeiro acesso).
  async changeOwnPassword(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado." });
      const result = await this.userService.changeOwnPassword(req.user.companyId, req.user.userId, req.body);
      return res.status(200).json(result);
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

      await this.userService.delete(req.user.companyId, req.user.userId, id);
      return res.status(200).json({ message: "Usuário excluído com sucesso" });
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

      const user = await this.userService.update(req.user.companyId, updateData, id, req.user.userId);
      return res.status(200).json(user);
    } catch (error: any) {
      return sendError(res, error);
    }
  }

async login(req:Request,res:Response){
try {
  const data = req.body

const user = await this.userService.login(data)

return res.status(200).json(user)

} catch (error:any) {
  return sendError(res, error);
}

}

}
