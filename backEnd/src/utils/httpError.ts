import { Response } from "express";

const GENERIC_MESSAGE = "Não foi possível concluir a operação. Tente novamente.";

// Erros esperados (AppError e derivados, com statusCode < 500) mostram a mensagem ao usuário.
// Qualquer outro erro é registrado no servidor e responde uma mensagem genérica,
// para não expor detalhes internos como SQL ou nomes de tabelas.
export function sendError(res: Response, error: unknown, fallback = GENERIC_MESSAGE) {
  const statusCode = typeof error === "object" && error !== null && "statusCode" in error
    ? Number((error as { statusCode: unknown }).statusCode)
    : NaN;

  if (Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 500) {
    return res.status(statusCode).json({ error: (error as Error).message });
  }

  console.error("Erro inesperado:", error);
  return res.status(Number.isInteger(statusCode) && statusCode >= 500 && statusCode < 600 ? statusCode : 500).json({ error: fallback });
}
