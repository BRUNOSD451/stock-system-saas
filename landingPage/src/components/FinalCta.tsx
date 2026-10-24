import { ArrowRight } from "lucide-react";
import { LINKS, PRICING } from "../config";

export default function FinalCta() {
  return (
    <section className="final-cta" aria-labelledby="final-cta-title">
      <div className="container final-cta-inner">
        <h2 id="final-cta-title" className="final-cta-title">Seu estoque em dia a partir de hoje.</h2>
        <div className="final-cta-side">
          <p>Crie a conta da empresa e use tudo por {PRICING.trialDays} dias, sem pagar nada.</p>
          <div className="hero-actions">
            <a className="btn btn-signal btn-lg" href={LINKS.signup}>Começar teste grátis <ArrowRight size={18} aria-hidden /></a>
            <a className="btn btn-outline-dark btn-lg" href={LINKS.login}>Entrar</a>
          </div>
        </div>
      </div>
    </section>
  );
}
