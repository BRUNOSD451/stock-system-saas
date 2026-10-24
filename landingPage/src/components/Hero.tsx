import { ArrowRight } from "lucide-react";
import ScreenFrame from "./ScreenFrame";
import dashboard from "../assets/screens/dashboard.png";
import { LINKS, PRICING } from "../config";

// O título em estêncil é o momento de marca da página; o resto fica quieto em volta dele.
export default function Hero() {
  return (
    <section className="hero" id="topo" aria-labelledby="hero-title">
      <div className="container hero-inner">
        <div className="hero-copy">
          <h1 id="hero-title" className="hero-title">Tudo o que entra e sai, registrado.</h1>
          <p className="hero-lead">
            Controle de estoque para pequenas empresas. Registre recebimentos e retiradas em poucos cliques,
            saiba o que precisa de reposição antes de faltar e acompanhe tudo, inclusive pelo celular.
          </p>
          <div className="hero-actions">
            <a className="btn btn-signal btn-lg" href={LINKS.signup}>Começar teste grátis <ArrowRight size={18} aria-hidden /></a>
            <a className="btn btn-outline-dark btn-lg" href={LINKS.login}>Já tenho conta</a>
          </div>
          <p className="hero-note">{PRICING.trialDays} dias grátis, sem cartão de crédito. Depois, {PRICING.proMonthly} por mês por empresa.</p>
        </div>
      </div>

      <div className="container hero-shot">
        <ScreenFrame src={dashboard} priority
          alt="Dashboard do StockControl com produtos cadastrados, unidades em estoque, produtos com estoque baixo, valor do estoque, gráfico de entradas e saídas da semana e lista do que precisa de reposição." />
      </div>
    </section>
  );
}
