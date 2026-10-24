import { Router, Request, Response } from "express";
import { BillingController } from "../controllers/billingController";

// Montado em server.ts com authenticateToken e requireAdmin: só o administrador assina.
// As duas gravações ficam liberadas no modo consulta (ver authMiddleware), senão não haveria como sair dele.
const BillingRouter = Router();
const billingController = new BillingController();

BillingRouter.get("/", (req: Request, res: Response) => billingController.getOverview(req, res));

BillingRouter.post("/checkout", (req: Request, res: Response) => billingController.createCheckout(req, res));

BillingRouter.post("/simulated/confirm", (req: Request, res: Response) => billingController.confirmSimulated(req, res));

export default BillingRouter;
