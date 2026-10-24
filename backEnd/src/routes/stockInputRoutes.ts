import { Router, Request, Response } from "express";
import { StockInputController } from "../controllers/stockInputController";
import { requireAdmin, requireRole } from "../middlewares/requireAdmin";

// Consulta: telas de Entradas/Saídas (admin e supervisor). Registro: todos, pela ação rápida da Home.
const canViewMovements = requireRole("administrador", "supervisor");

const StockInputRouter = Router();
const stockInputController = new StockInputController();

StockInputRouter.get("/", canViewMovements, (req: Request, res: Response) =>
    stockInputController.findAll(req, res)
);

StockInputRouter.post("/input", (req: Request, res: Response) => {
    return stockInputController.input(req, res);
});

// Estorno: mesmos cargos que consultam as entradas.
StockInputRouter.post("/:id/reverse", canViewMovements, (req: Request, res: Response) =>
    stockInputController.reverse(req, res)
);

StockInputRouter.delete("/:id", requireAdmin, (req: Request, res: Response) => {
    return stockInputController.delete(req, res);
});

StockInputRouter.get("/:id", canViewMovements, (req, res, next) =>
    stockInputController.findById(req, res, next)
);

export default StockInputRouter;
