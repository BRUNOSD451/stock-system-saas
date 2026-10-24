import { Router, Request , Response } from "express";
import { ProductsController } from "../controllers/productsController";
import multer from "multer";
import { requireAdmin, requireRole } from "../middlewares/requireAdmin";

const ProductsRouter = Router()

const productsController = new ProductsController()

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

// Leitura para qualquer usuário autenticado.
ProductsRouter.get("/", (req:Request,res:Response)=>{
return productsController.findAll(req,res)
});

// Cadastro e edição para administradores e supervisores, como na tela de Produtos.
ProductsRouter.post("/create", requireRole("administrador", "supervisor"), upload.single("image"), (req: Request, res: Response) => {
    return productsController.create(req,res)
})

ProductsRouter.delete("/:id", requireAdmin, (req:Request,res:Response)=>{
    return productsController.delete(req,res)
})

ProductsRouter.patch("/update/:id", requireRole("administrador", "supervisor"), upload.single("image"), (req:Request,res:Response)=>{
    return productsController.update(req,res)
})

// Inativar/reativar e ajustar o saldo após contagem: mesmos cargos que editam produtos.
ProductsRouter.patch("/:id/status", requireRole("administrador", "supervisor"), (req: Request, res: Response) =>
    productsController.setActive(req, res)
)

ProductsRouter.post("/:id/adjust", requireRole("administrador", "supervisor"), (req: Request, res: Response) =>
    productsController.adjust(req, res)
)

export default ProductsRouter
