import { BILLING_PERIOD_MONTHS, PLANS, hasActivePro, resolveAccess } from "../config/plans";
import type { companyInterface } from "../config/types";
import { CompaniesRepository } from "../repository/companiesRepository";
import { AppError, NotFoundError } from "../utils/errors";
import { toPublicCompany } from "./companiesService";

// Cobrança da assinatura do plano pro. O gateway fica atrás de BillingProvider: hoje só existe o
// simulado (desenvolvimento). O gateway real implementa createCheckout com a página de pagamento
// dele, e a ativação passa a vir do webhook, que chama activateSubscription como o confirmSimulated.
// Cada pagamento libera BILLING_PERIOD_MONTHS; sem novo pagamento, a empresa volta ao modo consulta.
interface BillingProvider {
  name: string;
  createCheckout(company: companyInterface): Promise<{ checkoutUrl: string }>;
}

const simulatedProvider: BillingProvider = {
  name: "simulated",
  // Página do próprio frontend que imita o checkout do gateway.
  async createCheckout() {
    return { checkoutUrl: "/assinatura/simulada" };
  },
};

// O simulado ativa o pro sem pagamento: precisa ser pedido explicitamente e nunca roda em produção.
function getProvider(): BillingProvider | null {
  const name = process.env.BILLING_PROVIDER?.trim();
  if (name === "simulated" && process.env.NODE_ENV !== "production") return simulatedProvider;
  return null;
}

const ALREADY_SUBSCRIBED = "Sua empresa já assina o plano Pro.";

export class BillingService {
  private companiesRepository = new CompaniesRepository();

  async getOverview(companyId: number) {
    const company = await this.companiesRepository.findById(companyId);
    return {
      company: toPublicCompany(company),
      plan: {
        id: "pro",
        label: PLANS.pro.label,
        monthlyPriceCents: PLANS.pro.monthlyPriceCents,
        periodMonths: BILLING_PERIOD_MONTHS,
      },
      canSubscribe: !hasActivePro(resolveAccess(company)),
      billingAvailable: getProvider() !== null,
    };
  }

  async createCheckout(companyId: number) {
    const provider = getProvider();
    if (!provider) throw new AppError("A cobrança ainda não está disponível. Tente novamente mais tarde.", 503);

    const company = await this.companiesRepository.findById(companyId);
    if (hasActivePro(resolveAccess(company))) throw new AppError(ALREADY_SUBSCRIBED, 409);

    return provider.createCheckout(company);
  }

  // Equivale ao webhook de pagamento aprovado, disponível só com o provedor simulado.
  async confirmSimulated(companyId: number) {
    if (getProvider()?.name !== "simulated") throw new NotFoundError("Recurso não encontrado.");
    const current = await this.companiesRepository.findById(companyId);
    if (hasActivePro(resolveAccess(current))) throw new AppError(ALREADY_SUBSCRIBED, 409);

    const company = await this.companiesRepository.activateSubscription(companyId, "pro", BILLING_PERIOD_MONTHS);
    return toPublicCompany(company);
  }
}
