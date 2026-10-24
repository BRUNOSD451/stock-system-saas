import { Router, Request, Response } from "express";
import { StockOutputController } from "../controllers/stockOutputController";
import { requireAdmin, requireRole } from "../middlewares/requireAdmin";

// Consulta: telas de Entradas/Saídas (admin e supervisor). Registro: todos, pela ação rápida da Home.
const canViewMovements = requireRole("administrador", "supervisor");

const StockOutputRouter = Router();
const stockOutputController = new StockOutputController();

StockOutputRouter.get("/", canViewMovements, (req: Request, res: Response) =>
    stockOutputController.findAll(req, res)
);

StockOutputRouter.post("/output", (req: Request, res: Response) => {
    return stockOutputController.output(req, res);
});

// Estorno: mesmos cargos que consultam as saídas.
StockOutputRouter.post("/:id/reverse", canViewMovements, (req: Request, res: Response) =>
    stockOutputController.reverse(req, res)
);

StockOutputRouter.delete("/:id", requireAdmin, (req: Request, res: Response) => {
    return stockOutputController.delete(req, res);
});

StockOutputRouter.get("/:id", canViewMovements, (req, res, next) =>
    stockOutputController.findById(req, res, next)
);

export default StockOutputRouter;
