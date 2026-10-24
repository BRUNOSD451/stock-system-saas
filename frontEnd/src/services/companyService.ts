import type { Company } from "../resources/types/types";
import { apiController } from "./Api";

export interface CompanyUpdateData {
  name: string;
  email: string;
  lowStockThreshold: number;
}

class CompanyServiceClass {
  // Empresa do usuário logado.
  async getMine(): Promise<Company> {
    return apiController.get<Company>("/companies/me");
  }

  // Multipart: a logo é opcional; removeLogo apaga a atual sem enviar outra.
  async updateMine(data: CompanyUpdateData, logo?: File | null, removeLogo = false): Promise<Company> {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("email", data.email);
    formData.append("lowStockThreshold", String(data.lowStockThreshold));
    if (logo) formData.append("logo", logo);
    else if (removeLogo) formData.append("removeLogo", "true");
    return apiController.request<Company>("/companies/me", { method: "PATCH", body: formData });
  }
}

export const CompanyService = new CompanyServiceClass();
