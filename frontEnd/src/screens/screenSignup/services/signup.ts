import { apiController } from "../../../services/Api";
import type { Company, User } from "../../../resources/types/types";

export interface SignupData {
  companyName: string;
  userName: string;
  email: string;
  userCellNumber: string;
  password: string;
}

export interface SignupResponse {
  token: string;
  user: User;
  company: Company;
}

// Cria a empresa e o primeiro administrador; responde como o login (token, usuário e empresa).
export async function signup(data: SignupData): Promise<SignupResponse> {
  try {
    return await apiController.post<SignupResponse>("/companies/signup", data);
  } catch (error: unknown) {
    const message = error instanceof Error && error.message ? error.message : "Não foi possível criar a conta.";
    throw new Error(message, { cause: error });
  }
}
