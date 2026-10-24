import { Check } from "lucide-react";
import { LINKS, PRICING } from "../config";

// Mesma lista da tela Assinatura do sistema (PRO_FEATURES).
const PRO_FEATURES = [
  "Cadastro de produtos, categorias e fornecedores",
  "Registro de entradas e saídas de estoque",
  "Equipe com cargos de administrador, supervisor e funcionário",
  "Dashboard e avisos de estoque baixo",
  "Assistente de IA para consultar e registrar movimentações",
];

export default function Pricing() {
  return (
    <section className="section section-tinted" id="preco" aria-labelledby="pricing-title">
      <div className="container">
        <header className="section-head">
          <h2 id="pricing-title" className="section-title">Um plano, sem letra miúda.</h2>
          <p className="section-lead">Teste tudo de graça. Se servir para a sua empresa, assine o Pro.</p>
        </header>

        <div className="plans">
          <article className="plan" aria-labelledby="plan-trial-title">
            <h3 id="plan-trial-title" className="plan-name">Teste grátis</h3>
            <p className="plan-price"><strong>R$ 0</strong><span>por {PRICING.trialDays} dias</span></p>
            <p className="plan-text">Todos os recursos liberados desde o primeiro dia, para você cadastrar o estoque real e testar com a equipe.</p>
            <ul className="check-list">
              <li><Check size={16} strokeWidth={2.6} aria-hidden />Sem cartão de crédito</li>
              <li><Check size={16} strokeWidth={2.6} aria-hidden />Todos os recursos do Pro</li>
              <li><Check size={16} strokeWidth={2.6} aria-hidden />Nenhum dado é apagado quando o teste acaba</li>
            </ul>
            <a className="btn btn-outline btn-lg plan-cta" href={LINKS.signup}>Começar teste grátis</a>
          </article>

          <article className="plan is-featured" aria-labelledby="plan-pro-title">
            <h3 id="plan-pro-title" className="plan-name">Pro</h3>
            <p className="plan-price"><strong>{PRICING.proMonthly}</strong><span>por mês, por empresa</span></p>
            <p className="plan-text">A empresa inteira na mesma assinatura: administradores, supervisores e funcionários.</p>
            <ul className="check-list">
              {PRO_FEATURES.map((feature) => <li key={feature}><Check size={16} strokeWidth={2.6} aria-hidden />{feature}</li>)}
            </ul>
            <a className="btn btn-signal btn-lg plan-cta" href={LINKS.signup}>Criar conta</a>
          </article>
        </div>

        <p className="plans-note">
          Se o teste terminar sem assinatura, a conta entra em modo consulta: tudo continua visível, e os registros voltam assim que o Pro é assinado.
        </p>
      </div>
    </section>
  );
}
