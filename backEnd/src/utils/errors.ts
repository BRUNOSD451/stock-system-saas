export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Não é possível excluir este registro porque ele está sendo utilizado.") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

export function isForeignKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error &&
    ((error as { code?: string }).code === "ER_ROW_IS_REFERENCED_2" ||
      (error as { code?: string }).code === "ER_ROW_IS_REFERENCED");
}