import "../style/subscription.css";
import { Navigate } from "react-router-dom";
import { Check, CircleAlert, CircleCheck, Clock, Lock } from "lucide-react";
import LateralBar from "../../../resources/components/lateralBar/lateralBar";
import EmptyState from "../../../resources/components/emptyState/EmptyState";
import getUserData from "../../../services/getUserData";
import type { Company } from "../../../resources/types/types";
import { formatPriceCents } from "../../../services/billingService";
import { useSubscriptionScreen, type SubscriptionSituation } from "../services/useSubscriptionScreen";

// O que o Pro libera hoje: tudo o que o sistema faz.
const PRO_FEATURES = [
  "Cadastro de produtos, categorias e fornecedores",
  "Registro de entradas e saídas de estoque",
  "Equipe com cargos de administrador, supervisor e funcionário",
  "Dashboard e avisos de estoque baixo",
  "Assistente de IA para consultar e registrar movimentações",
];

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

const formatDate = (value: string) => dateFormat.format(new Date(value));

function SituationNotice({ situation, trialDaysLeft, company }: { situation: SubscriptionSituation; trialDaysLeft: number | null; company: Company }) {
  const { trialEndsAt, currentPeriodEnd } = company;
  const notices: Record<SubscriptionSituation, { tone: string; icon: React.ReactNode; title: string; text: string }> = {
    active: {
      tone: "ok", icon: <CircleCheck size={18} aria-hidden />, title: "Sua empresa assina o Pro",
      text: currentPeriodEnd
        ? `Todos os recursos estão liberados até ${formatDate(currentPeriodEnd)}. Depois disso, é preciso renovar.`
        : "Todos os recursos estão liberados.",
    },
    periodEnded: {
      tone: "warn", icon: <Lock size={18} aria-hidden />, title: "O mês pago do Pro terminou",
      text: `${currentPeriodEnd ? `A assinatura venceu em ${formatDate(currentPeriodEnd)}. ` : ""}Os dados continuam disponíveis para consulta. Renove para voltar a registrar e alterar.`,
    },
    trial: {
      tone: "info", icon: <Clock size={18} aria-hidden />,
      title: trialDaysLeft === 0 ? "Seu teste grátis termina hoje" : `Teste grátis: ${trialDaysLeft} ${trialDaysLeft === 1 ? "dia restante" : "dias restantes"}`,
      text: `${trialEndsAt ? `Vai até ${formatDate(trialEndsAt)}. ` : ""}Depois disso, os dados ficam só para consulta até a assinatura do Pro.`,
    },
    trialExpired: { tone: "warn", icon: <Lock size={18} aria-hidden />, title: "Seu teste grátis terminou", text: "Os dados continuam disponíveis para consulta. Assine o Pro para voltar a registrar e alterar." },
    pastDue: { tone: "warn", icon: <CircleAlert size={18} aria-hidden />, title: "Pagamento pendente", text: "Enquanto o pagamento não for confirmado, os dados ficam só para consulta." },
    inactive: { tone: "warn", icon: <Lock size={18} aria-hidden />, title: "Assinatura inativa", text: "Os dados continuam disponíveis para consulta. Assine o Pro para voltar a registrar e alterar." },
  };
  const notice = notices[situation];
  return (
    <div className={`subscription-notice is-${notice.tone}`} role="status">
      {notice.icon}
      <div>
        <p className="subscription-notice-title">{notice.title}</p>
        <p>{notice.text}</p>
      </div>
    </div>
  );
}

export default function SubscriptionScreen() {
  const {
    overview, situation, trialDaysLeft, justSubscribed,
    isLoading, loadError, isStarting, actionError, subscribe, retry,
  } = useSubscriptionScreen();

  const user = getUserData();
  if (!user || !localStorage.getItem("token")) return <Navigate to="/" replace />;
  if (user.userPosition !== "administrador") return <Navigate to="/home" replace />;

  return (
    <div className="app-layout">
      <LateralBar />
      <main className="page">
        <div className="page-inner">
          <header className="page-header">
            <div className="page-heading">
              <h1 className="page-title">Assinatura</h1>
              <p className="page-subtitle">Plano e cobrança da sua empresa.</p>
            </div>
          </header>

          {isLoading ? <EmptyState isLoading framed title="Carregando assinatura…" />
            : loadError || !overview || !situation ? (
              <div role="alert">
                <EmptyState framed title="Não foi possível carregar a assinatura">
                  <p>{loadError || "Tente novamente em instantes."}</p>
                  <button type="button" className="btn btn-secondary" onClick={retry}>Tentar novamente</button>
                </EmptyState>
              </div>
            ) : (
              <div className="subscription-layout">
                {justSubscribed && situation === "active" && (
                  <div className="subscription-notice is-ok" role="status">
                    <CircleCheck size={18} aria-hidden />
                    <div>
                      <p className="subscription-notice-title">Assinatura confirmada</p>
                      <p>
                        Obrigado! O Pro já está ativo para toda a equipe
                        {overview.company.currentPeriodEnd ? ` até ${formatDate(overview.company.currentPeriodEnd)}` : ""}.
                      </p>
                    </div>
                  </div>
                )}
                {!(justSubscribed && situation === "active") && (
                  <SituationNotice situation={situation} trialDaysLeft={trialDaysLeft} company={overview.company} />
                )}

                <section className="subscription-plan" aria-labelledby="subscription-plan-title">
                  <div className="subscription-plan-head">
                    <h2 id="subscription-plan-title" className="subscription-plan-name">{overview.plan.label}</h2>
                    {situation === "active" && <span className="tag subscription-current">Plano atual</span>}
                  </div>

                  <p className="subscription-price">
                    <strong>{formatPriceCents(overview.plan.monthlyPriceCents)}</strong>
                    <span>/mês</span>
                  </p>
                  <p className="subscription-hint">
                    Cada pagamento libera {overview.plan.periodMonths === 1 ? "1 mês" : `${overview.plan.periodMonths} meses`} de Pro para a empresa inteira.
                    Ao fim do período, renove para continuar registrando.
                  </p>

                  <ul className="subscription-features">
                    {PRO_FEATURES.map((feature) => (
                      <li key={feature}><Check size={16} strokeWidth={2.4} aria-hidden />{feature}</li>
                    ))}
                  </ul>

                  {overview.canSubscribe && (
                    <div className="subscription-actions">
                      {actionError && <p className="field-error" role="alert">{actionError}</p>}
                      {overview.billingAvailable ? (
                        <button type="button" className="btn btn-primary subscription-cta" onClick={subscribe} disabled={isStarting}>
                          {isStarting && <span className="btn-spinner" aria-hidden="true" />}
                          {isStarting ? "Abrindo pagamento…" : situation === "periodEnded" ? "Renovar o Pro" : "Assinar o Pro"}
                        </button>
                      ) : (
                        <p className="subscription-hint">A assinatura on-line estará disponível em breve.</p>
                      )}
                    </div>
                  )}
                </section>
              </div>
            )}
        </div>
      </main>
    </div>
  );
}
