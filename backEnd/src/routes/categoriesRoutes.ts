import { Router, Request, Response } from "express";
import { CategoriesController } from "../controllers/categoriesController";
import { requireAdmin } from "../middlewares/requireAdmin";

const CategoriesRouter = Router();
const categoriesController =  new CategoriesController()

// Leitura para qualquer usuário autenticado (o cadastro de produto lista as categorias).
CategoriesRouter.get("/",(req: Request, res:Response)  =>
    categoriesController.findAll(req,res)
);

// Alterações somente para administradores, como na tela de Categorias.
CategoriesRouter.post("/create", requireAdmin, (req: Request, res: Response) => {
    return categoriesController.create(req,res)
})

CategoriesRouter.delete("/:id", requireAdmin, (req:Request,res:Response)=>{
    return categoriesController.delete(req,res)
})

CategoriesRouter.patch("/update/:id", requireAdmin, (req:Request, res:Response)=>{
    return categoriesController.update(req,res)
})

export default CategoriesRouter
