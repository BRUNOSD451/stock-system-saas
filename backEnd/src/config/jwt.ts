import "dotenv/config";
import jwt, { JwtPayload as JsonWebTokenPayload, SignOptions } from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET não configurado. Defina essa variável no arquivo .env.");
}

const secret: string = jwtSecret;

const jwtExpiresIn = (process.env.JWT_EXPIRES_IN || "1d") as SignOptions["expiresIn"];

// Algoritmo fixo: o verify recusa tokens assinados de outra forma.
const ALGORITHM = "HS256" as const;

// companyId identifica a empresa em toda requisição. role e mustChangePassword são atualizados
// pelo authMiddleware a partir do banco; tokenVersion permite invalidar sessões antigas.
export interface JwtPayload {
  userId: number;
  userCellNumber: string;
  companyId: number;
  role: string;
  // Com senha provisória, o token só serve para criar a senha definitiva.
  mustChangePassword?: boolean;
  tokenVersion?: number;
}

export function createAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, secret, { expiresIn: jwtExpiresIn, algorithm: ALGORITHM });
}

export function verifyAccessToken(token: string): JwtPayload {
  const payload = jwt.verify(token, secret, { algorithms: [ALGORITHM] }) as JsonWebTokenPayload;

  // Tokens emitidos antes do multiempresa não têm companyId e são recusados: o usuário entra de novo.
  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof payload.userId !== "number" ||
    typeof payload.userCellNumber !== "string" ||
    typeof payload.companyId !== "number" ||
    typeof payload.role !== "string"
  ) {
    throw new Error("Token inválido");
  }

  return {
    userId: payload.userId,
    userCellNumber: payload.userCellNumber,
    companyId: payload.companyId,
    role: payload.role,
    // Tokens antigos não têm estes campos e seguem valendo normalmente.
    mustChangePassword: payload.mustChangePassword === true,
    tokenVersion: typeof payload.tokenVersion === "number" ? payload.tokenVersion : 0,
  };
}
