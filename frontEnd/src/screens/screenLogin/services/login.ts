import { apiController } from "../../../services/Api";
import type { Company, User } from "../../../resources/types/types";

export interface LoginResponse {
  token: string;
  user: User;
  company: Company;
}

export async function login(cellNumber: string, password: string): Promise<LoginResponse> {
  try {
    const formattedCellNumber = cellNumber.replace(/\D/g, "");

    const data = await apiController.post<LoginResponse>("/users/login", {
      userCellNumber: formattedCellNumber,
      password,
    });

    return data;
  } catch (error: unknown) {
    const message = error instanceof Error && error.message ? error.message : "Erro ao fazer login";
    throw new Error(message, { cause: error });
  }
}
