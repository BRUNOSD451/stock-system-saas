import { Router, Request, Response } from "express";
import multer from "multer";
import { CompaniesController } from "../controllers/companiesController";
import { authenticateToken } from "../middlewares/authMiddleware";
import { requireAdmin } from "../middlewares/requireAdmin";
import { signupLimit } from "../middlewares/rateLimit";

const CompaniesRouter = Router();

const companiesController = new CompaniesController();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Envie apenas arquivos de imagem."));
      return;
    }
    callback(null, true);
  },
});

// Público: cria a empresa e o primeiro administrador.
CompaniesRouter.post("/signup", signupLimit, (req: Request, res: Response) => {
  return companiesController.signup(req, res);
});

// Empresa do usuário logado: leitura para todos (o limite de estoque baixo é usado nas telas),
// edição somente para administradores.
CompaniesRouter.get("/me", authenticateToken, (req: Request, res: Response) => {
  return companiesController.getMine(req, res);
});

CompaniesRouter.patch("/me", authenticateToken, requireAdmin, upload.single("logo"), (req: Request, res: Response) => {
  return companiesController.updateMine(req, res);
});

export default CompaniesRouter;
