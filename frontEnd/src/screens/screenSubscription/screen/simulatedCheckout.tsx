import "../style/subscription.css";
import { Navigate } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import EmptyState from "../../../resources/components/emptyState/EmptyState";
import getUserData from "../../../services/getUserData";
import { formatPriceCents } from "../../../services/billingService";
import { useSimulatedCheckout } from "../services/useSimulatedCheckout";

// Fica no lugar da página de pagamento do gateway enquanto ele não é integrado.
export default function SimulatedCheckoutScreen() {
  const { overview, isLoading, isConfirming, error, confirm, cancel } = useSimulatedCheckout();

  const user = getUserData();
  if (!user || !localStorage.getItem("token")) return <Navigate to="/" replace />;
  if (user.userPosition !== "administrador") return <Navigate to="/home" replace />;
  if (overview && !overview.canSubscribe) return <Navigate to="/assinatura" replace />;

  return (
    <main className="checkout-page">
      <div className="checkout-card">
        <p className="checkout-badge"><FlaskConical size={14} aria-hidden /> Ambiente de teste</p>
        <h1 className="checkout-title">Pagamento simulado</h1>
        <p className="checkout-text">
          Nenhum valor é cobrado. Com o gateway integrado, esta etapa é a página de pagamento dele.
        </p>

        {isLoading ? <EmptyState isLoading title="Carregando…" />
          : overview && (
            <dl className="checkout-summary">
              <div><dt>Empresa</dt><dd>{overview.company.name}</dd></div>
              <div><dt>Plano</dt><dd>{overview.plan.label}</dd></div>
              <div><dt>Valor</dt><dd>{formatPriceCents(overview.plan.monthlyPriceCents)}</dd></div>
              <div><dt>Período</dt><dd>{overview.plan.periodMonths === 1 ? "1 mês" : `${overview.plan.periodMonths} meses`} a partir de hoje</dd></div>
            </dl>
          )}

        {error && <p className="field-error" role="alert">{error}</p>}

        <div className="checkout-actions">
          <button type="button" className="btn btn-ghost" onClick={cancel} disabled={isConfirming}>Voltar</button>
          <button type="button" className="btn btn-primary" onClick={confirm} disabled={isLoading || !overview || isConfirming}>
            {isConfirming && <span className="btn-spinner" aria-hidden="true" />}
            {isConfirming ? "Confirmando…" : "Confirmar pagamento"}
          </button>
        </div>
      </div>
    </main>
  );
}
