import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "./authMiddleware";

// Libera a rota só para os cargos informados, ex.: requireRole("administrador", "supervisor").
// O cargo em req.user.role é o atual do banco (lido pelo authenticateToken a cada requisição).
export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Autenticação necessária." });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Você não tem permissão para esta ação." });
    }
    return next();
  };
}

export const requireAdmin = requireRole("administrador");
