import { Router, Request, Response } from "express";
import { OutputItemController } from "../controllers/outputItemController";
import { requireRole } from "../middlewares/requireAdmin";

const OutputItemRouter = Router();
const outputItemController = new OutputItemController();

// Itens são criados pela movimentação completa de estoque; esta rota atende ao histórico.
OutputItemRouter.get("/", requireRole("administrador", "supervisor"), (req: Request, res: Response) =>
    outputItemController.findAll(req, res)
);

export default OutputItemRouter;
