import type { CompanyStatus } from "./types";

// Planos oferecidos. A coluna companies.plan guarda só o id; limites e recursos entram aqui.
// O free é só o período de teste; depois dele, a empresa precisa assinar o pro.
// Preço em centavos, cobrança mensal. É a fonte do valor mostrado na tela e enviado ao gateway.
export const PLANS = {
  free: { label: "Grátis", monthlyPriceCents: null },
  pro: { label: "Pro", monthlyPriceCents: 4990 },
} as const;

export type PlanId = keyof typeof PLANS;

// Cada pagamento confirmado libera este período.
export const BILLING_PERIOD_MONTHS = 1;

// Situação da assinatura da empresa, calculada a cada requisição a partir do banco.
export interface CompanyAccess {
  plan: PlanId;
  status: CompanyStatus;
  trialExpired: boolean;
  // Assinatura ativa cujo período pago já terminou sem renovação.
  periodEnded: boolean;
  // Somente leitura: consulta liberada, gravações bloqueadas até a assinatura ser regularizada.
  readOnly: boolean;
}

const READ_ONLY_STATUSES: CompanyStatus[] = ["past_due", "canceled", "suspended"];

type DateValue = Date | string | null;
const hasPassed = (value: DateValue, now: Date) => value !== null && new Date(value) <= now;

// Fim do teste e do período pago são calculados na leitura, sem job para mudar o status no banco.
// Data ausente não bloqueia: um dado faltando não pode travar o cliente.
export function resolveAccess(
  company: { plan: string; status: string; trialEndsAt: DateValue; currentPeriodEnd: DateValue },
  now: Date = new Date(),
): CompanyAccess {
  const plan = (Object.prototype.hasOwnProperty.call(PLANS, company.plan) ? company.plan : "free") as PlanId;
  const status = company.status as CompanyStatus;
  const trialExpired = status === "trial" && hasPassed(company.trialEndsAt, now);
  const periodEnded = status === "active" && hasPassed(company.currentPeriodEnd, now);
  return {
    plan,
    status,
    trialExpired,
    periodEnded,
    readOnly: trialExpired || periodEnded || READ_ONLY_STATUSES.includes(status),
  };
}

// Pro pago e dentro do período: não há o que assinar.
export const hasActivePro = (access: CompanyAccess) => access.plan === "pro" && access.status === "active" && !access.periodEnded;
