import { Router,Request,Response } from "express";
import { SupplierController } from "../controllers/suppliersController";
import { requireAdmin, requireRole } from "../middlewares/requireAdmin";

const SupplierRouter = Router()

const supplierController = new SupplierController()

// Leitura para qualquer usuário autenticado (o cadastro de produto lista os fornecedores).
SupplierRouter.get("/",(req:Request,res:Response)=>{
return supplierController.findAll(req,res)
})

// Supervisores também cadastram fornecedores pela ação rápida da Home.
SupplierRouter.post("/create", requireRole("administrador", "supervisor"), (req:Request,res:Response )=>{
    return supplierController.create(req,res)
})

// Editar e excluir só na tela de Fornecedores, exclusiva do administrador.
SupplierRouter.delete("/:id", requireAdmin, (req:Request , res:Response)=>{
    return supplierController.delete(req,res)
})

SupplierRouter.patch("/update/:id", requireAdmin, (req:Request, res:Response)=>{
    return supplierController.update(req,res)
})

export default SupplierRouter
