import { Request, Response, NextFunction } from "express";
import { generateChatReply } from "../services/chatService";
import { loadChatMemory } from "../services/chatMemory";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";

export async function chatBotInput(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Autenticação necessária." });

  const message = req.body?.message;
  if (typeof message !== "string" || !message.trim() || message.length > 4000) {
    return res.status(400).json({ error: "Envie uma mensagem de até 4000 caracteres." });
  }

  try {
    const reply = await generateChatReply(message.trim(), req.user.userId, req.user.companyId);
    return res.json({ message: reply });
  } catch (error) {
    return next(error);
  }
}

export async function chatBotHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Autenticação necessária." });
  try {
    const history = await loadChatMemory(req.user.userId);
    res.setHeader("Cache-Control", "no-store");
    return res.json({ messages: history.map(message => ({
      role: message.getType() === "human" ? "user" : "assistant",
      content: message.content,
    })) });
  } catch (error) {
    return next(error);
  }
}
