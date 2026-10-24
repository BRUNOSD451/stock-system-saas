import { Router, Request, Response } from "express";
import { InputItemController } from "../controllers/inputItemController";
import { requireRole } from "../middlewares/requireAdmin";

const InputItemRouter = Router();
const inputItemController = new InputItemController();

// Itens são criados pela movimentação completa de estoque; esta rota atende ao histórico.
InputItemRouter.get("/", requireRole("administrador", "supervisor"), (req: Request, res: Response) =>
    inputItemController.findAll(req, res)
);

export default InputItemRouter;
