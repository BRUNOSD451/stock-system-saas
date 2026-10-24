import { NextFunction, Request, Response } from "express";
import { JwtPayload, verifyAccessToken } from "../config/jwt";
import { db } from "../database/db";
import { CompanyAccess, resolveAccess } from "../config/plans";

// companyId vem sempre do token, nunca do body ou da URL.
export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  company?: CompanyAccess;
}

export const PASSWORD_CHANGE_PATH = "/users/me/password";

const INVALID_SESSION = { error: "Sua sessão expirou. Entre novamente." };

// Gravações que continuam liberadas com a assinatura inativa: não alteram dados do negócio,
// e a assinatura é justamente o caminho para sair do modo consulta.
const READ_ONLY_ALLOWED = new Set([
  `POST ${PASSWORD_CHANGE_PATH}`,
  "PATCH /notifications/read",
  "POST /billing/checkout",
  "POST /billing/simulated/confirm",
]);
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authorization = req.header("Authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Token de autenticação não informado" });
  }

  let payload: JwtPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ error: "Token de autenticação inválido ou expirado" });
  }

  // O token sozinho não basta: o usuário precisa existir, continuar na mesma empresa e a sessão
  // não pode ter sido encerrada (troca ou redefinição de senha aumenta token_version).
  try {
    const { rows } = await db.query(
      `SELECT u.company_id, u.user_position, u.must_change_password, u.token_version,
         c.plan, c.status, c.trial_ends_at, c.current_period_end
       FROM users u JOIN companies c ON c.company_id = u.company_id
       WHERE u.user_id = ?`,
      [payload.userId],
    );
    const current = rows[0];
    if (!current || current.companyId !== payload.companyId || Number(current.tokenVersion) !== payload.tokenVersion) {
      return res.status(401).json(INVALID_SESSION);
    }

    // Cargo, troca de senha e assinatura valem pelo estado atual do banco.
    req.user = { ...payload, role: String(current.userPosition), mustChangePassword: Boolean(Number(current.mustChangePassword)) };
    req.company = resolveAccess(current as { plan: string; status: string; trialEndsAt: Date | null; currentPeriodEnd: Date | null });
  } catch (error) {
    return next(error);
  }

  const path = req.originalUrl.split("?")[0];

  // Com senha provisória, só a troca de senha é permitida até a pessoa criar a dela.
  if (req.user.mustChangePassword && path !== PASSWORD_CHANGE_PATH) {
    return res.status(403).json({ error: "Crie sua senha para continuar.", code: "PASSWORD_CHANGE_REQUIRED" });
  }

  // Assinatura inativa: tudo pode ser consultado, nada do negócio pode ser gravado (inclui o chat,
  // que registra movimentações e usa uma API paga).
  if (req.company.readOnly && !READ_METHODS.has(req.method) && !READ_ONLY_ALLOWED.has(`${req.method} ${path}`)) {
    return res.status(402).json({
      error: req.company.trialExpired
        ? "Seu período de teste terminou. Assine um plano para voltar a registrar dados."
        : req.company.periodEnded
          ? "O mês pago da assinatura Pro terminou. Renove para voltar a registrar dados."
          : "A assinatura da empresa está inativa. Os dados ficam disponíveis só para consulta.",
      code: "SUBSCRIPTION_INACTIVE",
    });
  }

  return next();
}
