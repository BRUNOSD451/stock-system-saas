// Endereço do sistema (frontEnd). Em produção, defina VITE_APP_URL no ambiente do build.
const APP_URL = (import.meta.env.VITE_APP_URL ?? "http://localhost:5173").replace(/\/$/, "");

// Rotas do sistema: "/" é o login e "/signup" cria a empresa com o teste grátis.
export const LINKS = {
  login: `${APP_URL}/`,
  signup: `${APP_URL}/signup`,
};

// Mesmos valores do backend (backEnd/src/config/plans.ts e TRIAL_DAYS em companiesService.ts).
// Ao mudar o preço ou o teste lá, atualize aqui.
export const PRICING = {
  trialDays: 14,
  proMonthly: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(49.9),
};
