import { getCompanyData, saveCompanyData } from "./getUserData";

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
}

function isForeignKeyMessage(value: string) {
  const normalized = value.toLowerCase();
  return normalized.includes("foreign key") ||
    normalized.includes("cannot delete or update a parent row") ||
    normalized.includes("er_row_is_referenced") ||
    normalized.includes("1451");
}

function getFriendlyErrorMessage(message: string, method: RequestOptions["method"]) {
  if (isForeignKeyMessage(message)) {
    if (method === "DELETE") {
      return "Não é possível excluir este registro porque ele está relacionado a outros dados. Exclua primeiro os registros dependentes ou mantenha este cadastro ativo.";
    }
    return "Esta operação não pode ser concluída porque existem dados relacionados a este registro.";
  }
  return message;
}

class ApiController {
  private baseUrl = "http://localhost:4000";

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem("token");

    if (!token) {
      return {};
    }

    return {
      Authorization: `Bearer ${token}`,
    };
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const response = await fetch(
      `${this.baseUrl}${endpoint}`,
      {
        method: options.method || "GET",
        headers: {
          ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
          ...this.getAuthHeaders(),
          ...options.headers,
        },
        body: options.body instanceof FormData
          ? options.body
          : options.body
            ? JSON.stringify(options.body)
            : undefined,
      }
    );

    const responseText = await response.text();

    let responseData: unknown;
    if (responseText.trim()) {
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = undefined;
      }
    }

    if (!response.ok) {
      const errorData = responseData as { error?: unknown; message?: unknown; code?: unknown } | undefined;

      // Sessão encerrada (senha trocada, usuário removido ou token vencido): volta ao login.
      // No próprio login, 401 significa só celular ou senha incorretos.
      if (response.status === 401 && endpoint !== "/users/login" && localStorage.getItem("token")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("company");
        window.location.assign("/");
      }

      // Senha provisória: qualquer tela leva à criação da senha antes de continuar.
      if (response.status === 403 && errorData?.code === "PASSWORD_CHANGE_REQUIRED" && window.location.pathname !== "/trocar-senha") {
        window.location.assign("/trocar-senha");
      }

      // Assinatura ficou inativa com a sessão aberta: a barra lateral passa a mostrar o modo consulta.
      if (response.status === 402 && errorData?.code === "SUBSCRIPTION_INACTIVE") {
        const company = getCompanyData();
        if (company && !company.readOnly) saveCompanyData({ ...company, readOnly: true });
      }

      const serverMessage = typeof errorData?.error === "string"
        ? errorData.error
        : typeof errorData?.message === "string"
          ? errorData.message
          : undefined;
      const message = getFriendlyErrorMessage(
        serverMessage || `Erro ${response.status}: ${response.statusText}`,
        options.method || "GET"
      );
      throw new Error(message);
    }

    if (responseData === undefined) {
      return undefined as T;
    }

    return responseData as T;
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: "POST",
      body,
    });
  }

  postForm<T>(endpoint: string, body: FormData) {
    return this.request<T>(endpoint, {
      method: "POST",
      body,
    });
  }

  put<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: "PUT",
      body,
    });
  }

  patch<T>(endpoint: string, body: unknown) {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body,
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, {
      method: "DELETE",
    });
  }
}

export const apiController =   new ApiController();