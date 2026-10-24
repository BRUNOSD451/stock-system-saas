import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { AppError } from "../utils/errors";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const multerError = err instanceof multer.MulterError;

  if (multerError || err.message === "Envie apenas arquivos de imagem.") {
    return res.status(400).json({
      error: multerError && err.code === "LIMIT_FILE_SIZE"
        ? "A imagem deve ter no máximo 5 MB."
        : err.message,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  console.error("Unexpected error:", err);
  return res.status(500).json({
    error: "Não foi possível concluir a operação. Tente novamente.",
  });
}