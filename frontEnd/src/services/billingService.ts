import type { BillingOverview, Company } from "../resources/types/types";
import { apiController } from "./Api";

class BillingServiceClass {
  getOverview(): Promise<BillingOverview> {
    return apiController.get<BillingOverview>("/billing");
  }

  // Devolve o endereço do checkout: página do gateway ou, em desenvolvimento, a página simulada.
  createCheckout(): Promise<{ checkoutUrl: string }> {
    return apiController.post<{ checkoutUrl: string }>("/billing/checkout", {});
  }

  // Só existe com o provedor simulado; no gateway real a ativação vem do webhook.
  confirmSimulated(): Promise<Company> {
    return apiController.post<Company>("/billing/simulated/confirm", {});
  }
}

export const BillingService = new BillingServiceClass();

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const formatPriceCents = (cents: number) => currency.format(cents / 100);
