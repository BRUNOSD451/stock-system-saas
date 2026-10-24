import { Router, Request, Response } from "express";
import { UserController } from "../controllers/userController";
import { authenticateToken } from "../middlewares/authMiddleware";
import { requireAdmin } from "../middlewares/requireAdmin";
import { loginLimitByAccount, loginLimitByIp, passwordChangeLimit } from "../middlewares/rateLimit";

import multer from "multer";

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
const UserRouter = Router();

const userController = new UserController();

// Login é público. O cadastro público agora é POST /companies/signup, que cria empresa e administrador.
UserRouter.post("/login", loginLimitByIp, loginLimitByAccount, (req:Request,res:Response)=>{
  return userController.login(req,res)
})

// Todas as operações abaixo exigem autenticação e ficam limitadas à empresa do token.
UserRouter.use(authenticateToken);
UserRouter.patch("/me/image", upload.single("image"), (req, res) => userController.updateImage(req, res));

// Única rota liberada enquanto a senha for provisória (ver authMiddleware).
UserRouter.post("/me/password", passwordChangeLimit, (req, res) => userController.changeOwnPassword(req, res));

// Gestão da equipe: somente administradores, e somente dentro da própria empresa.
UserRouter.post("/create", requireAdmin, upload.single("image"), (req:Request,res:Response ) =>{
    return userController.create(req,res)
})

UserRouter.get("/", requireAdmin, (req:Request, res:Response) =>
  userController.getAll(req, res)
);

UserRouter.post("/:id/reset-password", requireAdmin, (req:Request,res:Response)=>{
  return userController.resetPassword(req,res)
})

UserRouter.delete("/delete/:id", requireAdmin, (req:Request,res:Response)=>{

    return userController.delete(req,res)
})

UserRouter.patch("/update/:id", requireAdmin, (req:Request,res:Response)=>{
  return userController.update(req,res)
})

export default UserRouter;
