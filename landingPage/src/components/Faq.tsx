import { Plus } from "lucide-react";
import { PRICING } from "../config";

const QUESTIONS = [
  {
    q: "Preciso de cartão de crédito para testar?",
    a: "Não. O cadastro pede só os dados da empresa e de quem vai administrar a conta.",
  },
  {
    q: "O que acontece quando o teste acaba?",
    a: `Depois de ${PRICING.trialDays} dias, a conta entra em modo consulta: você continua vendo produtos, movimentações e o dashboard, mas não registra nada novo até assinar o Pro. Nenhum dado é apagado.`,
  },
  {
    q: "Quantas pessoas da equipe podem usar?",
    a: "A assinatura é por empresa. Você cadastra administradores, supervisores e funcionários, cada um com o próprio acesso.",
  },
  {
    q: "Funciona no celular?",
    a: "Sim. O StockControl roda no navegador e se adapta à tela do celular, sem instalar aplicativo.",
  },
  {
    q: "Outras empresas conseguem ver os meus dados?",
    a: "Não. Cada empresa só acessa os próprios produtos, movimentações e usuários; isso é verificado em toda consulta ao sistema.",
  },
];

// <details> nativo: abre e fecha com teclado e leitor de tela sem JavaScript.
export default function Faq() {
  return (
    <section className="section" id="duvidas" aria-labelledby="faq-title">
      <div className="container faq">
        <header className="section-head is-left">
          <h2 id="faq-title" className="section-title">Dúvidas frequentes</h2>
        </header>
        <div className="faq-list">
          {QUESTIONS.map(({ q, a }) => (
            <details className="faq-item" key={q}>
              <summary>{q}<Plus size={18} aria-hidden className="faq-icon" /></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
