import { BarChart3, Bell, Bot, ShieldCheck, Smartphone, Users } from "lucide-react";
import ScreenFrame from "./ScreenFrame";
import celular from "../assets/screens/celular.png";

const CAPABILITIES = [
  { icon: Users, title: "Equipe com cargos", text: "Administrador, supervisor e funcionário veem só o que precisam. Cada novo acesso recebe uma senha provisória, que você envia pelo WhatsApp." },
  { icon: BarChart3, title: "Dashboard da semana", text: "Unidades em estoque, valor armazenado e o gráfico de entradas e saídas dos últimos 7 dias." },
  { icon: Bot, title: "Assistente de IA", text: "Pergunte o que está acabando ou peça para registrar uma saída, escrevendo como numa conversa." },
  { icon: Bell, title: "Avisos de movimentação", text: "Cada entrada e saída gera um aviso com o nome de quem registrou." },
  { icon: Smartphone, title: "Pronto para o celular", text: "Registre uma entrada direto do depósito, pelo navegador do telefone, sem instalar nada." },
  { icon: ShieldCheck, title: "Dados protegidos", text: "Cada empresa só enxerga os próprios dados, e trocar uma senha encerra os acessos abertos com a anterior." },
];

export default function Capabilities() {
  return (
    <section className="section section-tinted" aria-labelledby="capabilities-title">
      <div className="container capabilities">
        <div className="capabilities-shot">
          <ScreenFrame src={celular} kind="phone"
            alt="StockControl no celular: tela inicial com os atalhos de nova entrada e nova saída e a lista do que precisa de reposição." />
        </div>

        <div>
          <header className="section-head is-left">
            <h2 id="capabilities-title" className="section-title">E o que mais a rotina pede.</h2>
          </header>
          <ul className="capability-list">
            {CAPABILITIES.map(({ icon: Icon, title, text }) => (
              <li className="capability" key={title}>
                <span className="capability-icon" aria-hidden="true"><Icon size={20} strokeWidth={1.9} /></span>
                <div>
                  <h3 className="capability-title">{title}</h3>
                  <p className="capability-text">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
