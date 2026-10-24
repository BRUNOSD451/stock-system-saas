import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ArrowDown, ArrowUp, Box, Boxes, TriangleAlert, Wallet } from "lucide-react";
import LateralBar from "../../../resources/components/lateralBar/lateralBar";
import EmptyState from "../../../resources/components/emptyState/EmptyState";
import LowStockPanel from "../../../resources/components/lowStock/LowStockPanel";
import { useLowStock } from "../../../resources/components/lowStock/useLowStock";
import getUserData from "../../../services/getUserData";
import { getDashboardData, type DashboardData } from "../services/dashboardData";
import "../style/dashboard.css";

const number = new Intl.NumberFormat("pt-BR");
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [selectedDay, setSelectedDay] = useState(6);
  const { lowStock, threshold, error: lowStockError } = useLowStock();
  const user = getUserData();
  const authorized = Boolean(user && localStorage.getItem("token") && user.userPosition === "administrador");

  useEffect(() => {
    if (!authorized) return;
    let active = true;
    getDashboardData().then(result => {
      if (!active) return;
      setData(result);
      setSelectedDay(Math.max(0, result.movements.length - 1));
    }).catch(() => {
      if (active) setError("Não foi possível carregar a dashboard. Tente novamente.");
    });
    return () => { active = false; };
  }, [authorized, attempt]);

  if (!user || !localStorage.getItem("token")) return <Navigate to="/" replace />;
  if (user.userPosition !== "administrador") return <Navigate to="/home" replace />;

  const header = <header className="page-header">
    <div className="page-heading"><h1 className="page-title">Dashboard</h1><p className="page-subtitle">Situação atual do estoque e movimentação da última semana.</p></div>
  </header>;

  if (!data) return <div className="app-layout">
    <LateralBar />
    <main className="page">
      <div className="page-inner">
        {header}
        {error
          ? <div role="alert"><EmptyState framed title="Não foi possível carregar a dashboard"><p>Verifique a conexão com o servidor e tente novamente.</p><button type="button" className="btn btn-secondary" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Tentar novamente</button></EmptyState></div>
          : <EmptyState isLoading framed title="Carregando dashboard…" />}
      </div>
    </main>
  </div>;

  const formatDay = (day: string) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${day}T12:00:00`));
  const metrics = [
    { label: "Produtos cadastrados", value: number.format(data.products), detail: "Itens no catálogo", icon: Box, alert: false },
    { label: "Unidades em estoque", value: number.format(data.inStock), detail: "Quantidade disponível", icon: Boxes, alert: false },
    { label: "Estoque baixo", value: number.format(data.lowStock), detail: data.lowStock > 0 ? "Produtos que precisam de reposição" : "Nenhum produto precisa de reposição", icon: TriangleAlert, alert: data.lowStock > 0 },
    { label: "Valor do estoque", value: currency.format(data.stockValue), detail: "Valor total dos itens armazenados", icon: Wallet, alert: false },
  ];
  const max = Math.max(20, Math.ceil(Math.max(0, ...data.movements.flatMap(day => [day.entries, day.outputs])) / 20) * 20);
  const x = (index: number) => 48 + index * 112;
  const y = (value: number) => 212 - value / max * 176;
  const points = (key: "entries" | "outputs") => data.movements.map((day, index) => `${x(index)},${y(day[key])}`).join(" ");
  const selected = data.movements[selectedDay];
  const isQuietWeek = data.movements.every(day => day.entries === 0 && day.outputs === 0);

  return <div className="app-layout">
    <LateralBar />
    <main className="page">
      <div className="page-inner">
        {header}

        {/* Uma faixa única de indicadores; só o estoque baixo ganha destaque, e apenas quando existe. */}
        <section className="metric-strip" aria-label="Resumo do estoque">
          {metrics.map(({ label, value, detail, icon: Icon, alert }) => <div className={`metric${alert ? " is-alert" : ""}`} key={label}>
            <p className="metric-label"><Icon size={16} strokeWidth={2} aria-hidden="true" />{label}</p>
            <p className="metric-value">{value}</p>
            <p className="metric-detail">{detail}</p>
          </div>)}
        </section>

        <div className="dashboard-grid">
        <section className="chart-sheet" aria-labelledby="movements-title">
          <div className="chart-heading">
            <div><h2 id="movements-title">Movimentações de estoque</h2><p>Unidades que entraram e saíram nos últimos 7 dias.</p></div>
            <div className="chart-legend"><span><i className="chart-key in" />Entradas</span><span><i className="chart-key out" />Saídas</span></div>
          </div>
          <div className="chart-scroll">
            <svg className="chart" viewBox="0 0 768 252" role="img" aria-label="Gráfico de linhas com entradas e saídas por dia. Os valores estão na tabela a seguir e nos botões de cada dia.">
              {[0, 1, 2, 3, 4].map(step => <g key={step}><line x1="48" x2="720" y1={y(step * max / 4)} y2={y(step * max / 4)} className="chart-grid" /><text x="32" y={y(step * max / 4) + 4} textAnchor="end">{step * max / 4}</text></g>)}
              {selected && <line className="chart-cursor" x1={x(selectedDay)} x2={x(selectedDay)} y1="28" y2="212" />}
              <polyline points={points("entries")} className="chart-line in" />
              <polyline points={points("outputs")} className="chart-line out" />
              {data.movements.map((day, index) => <g key={formatDay(day.day)}>
                <circle className={`chart-dot in${index === selectedDay ? " is-selected" : ""}`} cx={x(index)} cy={y(day.entries)} r={index === selectedDay ? 5 : 4} />
                <circle className={`chart-dot out${index === selectedDay ? " is-selected" : ""}`} cx={x(index)} cy={y(day.outputs)} r={index === selectedDay ? 5 : 4} />
                <text x={x(index)} y="240" textAnchor="middle" className={index === selectedDay ? "is-selected" : undefined}>{formatDay(day.day)}</text>
                {/* Área de toque da coluna inteira: o leitor aponta para o dia, não para a linha. */}
                <rect className="chart-hit" x={x(index) - 56} y="20" width="112" height="200" onPointerEnter={() => setSelectedDay(index)} onClick={() => setSelectedDay(index)} />
              </g>)}
            </svg>
          </div>
          <table className="sr-only">
            <caption>Entradas e saídas por dia, em unidades</caption>
            <thead><tr><th scope="col">Dia</th><th scope="col">Entradas</th><th scope="col">Saídas</th></tr></thead>
            <tbody>{data.movements.map(day => <tr key={day.day}><th scope="row">{formatDay(day.day)}</th><td>{number.format(day.entries)}</td><td>{number.format(day.outputs)}</td></tr>)}</tbody>
          </table>
          <div className="chart-days" role="group" aria-label="Consultar movimentações por dia">
            {data.movements.map((day, index) => <button type="button" key={formatDay(day.day)} aria-pressed={selectedDay === index} onClick={() => setSelectedDay(index)}>{formatDay(day.day)}</button>)}
          </div>
          {selected && <p className="chart-readout" aria-live="polite">
            <span className="chart-readout-day">{formatDay(selected.day)}</span>
            <span><i className="chart-key in" /><strong>{number.format(selected.entries)}</strong>entradas</span>
            <span><i className="chart-key out" /><strong>{number.format(selected.outputs)}</strong>saídas</span>
          </p>}
          {isQuietWeek && <p className="chart-empty">Nenhuma movimentação nos últimos 7 dias.</p>}
        </section>

        {/* O indicador diz quantos; a lista diz quais, para a reposição começar daqui. */}
        <LowStockPanel lowStock={lowStock} threshold={threshold} error={lowStockError} limit={7} />
        </div>

        <section className="flow-grid" aria-label="Resumo de entradas e saídas">
          {[{ title: "Entradas", values: data.entries, icon: ArrowDown, tone: "in" }, { title: "Saídas", values: data.outputs, icon: ArrowUp, tone: "out" }].map(({ title, values, icon: Icon, tone }) => <article className={`flow-card is-${tone}`} key={title}>
            <h2 className="flow-title"><span className="flow-mark"><Icon size={18} strokeWidth={2} aria-hidden="true" /></span>{title}</h2>
            <dl className="flow-figures"><div><dt>Hoje</dt><dd>{number.format(values.today)}<span>unidades</span></dd></div><div><dt>Neste mês</dt><dd>{number.format(values.month)}<span>unidades</span></dd></div></dl>
          </article>)}
        </section>
      </div>
    </main>
  </div>;
}
