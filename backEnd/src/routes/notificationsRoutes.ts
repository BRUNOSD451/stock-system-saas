import { Router, Request, Response } from "express";
import { NotificationController } from "../controllers/notificationController";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";

const NotificationsRouter = Router();
const notificationController = new NotificationController();

NotificationsRouter.post("/", (req: Request, res: Response) =>
  notificationController.findByUserId(req as AuthenticatedRequest, res)
);

NotificationsRouter.patch("/read", (req: Request, res: Response) =>
  notificationController.markAsRead(req as AuthenticatedRequest, res)
);

export default NotificationsRouter;
