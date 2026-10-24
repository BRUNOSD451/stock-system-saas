import type { Company, User } from "../resources/types/types";

export default function getUserData(): User | null {
  const userData = localStorage.getItem("user");

  if (!userData) {
    return null;
  }

  try {
    // O armazenamento pode conter dados antigos ou inválidos; o cast sozinho não os valida.
    const user: unknown = JSON.parse(userData);
    if (!user || typeof user !== "object") return null;
    if (!("userId" in user) || typeof user.userId !== "number" || !Number.isInteger(user.userId)) return null;
    if (!("userName" in user) || typeof user.userName !== "string") return null;
    if (!("userCellNumber" in user) || typeof user.userCellNumber !== "string") return null;
    if (!("userPosition" in user) || typeof user.userPosition !== "string") return null;
    return { imageUrl: "imageUrl" in user && typeof user.imageUrl === "string" ? user.imageUrl : null, userId: user.userId, userName: user.userName, userCellNumber: user.userCellNumber, userPosition: user.userPosition, mustChangePassword: "mustChangePassword" in user && user.mustChangePassword === true };
  } catch (error) {
    console.error("Error parsing user data:", error);
    return null;
  }
}

// Empresa salva no login/cadastro. Ausente em sessões antigas, que precisam entrar de novo.
export function getCompanyData(): Company | null {
  const companyData = localStorage.getItem("company");
  if (!companyData) return null;

  try {
    const company: unknown = JSON.parse(companyData);
    if (!company || typeof company !== "object") return null;
    if (!("companyId" in company) || typeof company.companyId !== "number") return null;
    if (!("name" in company) || typeof company.name !== "string") return null;
    return company as Company;
  } catch (error) {
    console.error("Error parsing company data:", error);
    return null;
  }
}

// Evento para a barra lateral atualizar nome e logo sem recarregar a página.
export const COMPANY_UPDATED_EVENT = "company-updated";

export function saveCompanyData(company: Company) {
  localStorage.setItem("company", JSON.stringify(company));
  window.dispatchEvent(new CustomEvent(COMPANY_UPDATED_EVENT, { detail: company }));
}

export function getUserId(): number {
  return getUserData()?.userId || 0;
}
