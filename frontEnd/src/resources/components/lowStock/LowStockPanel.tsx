import { Link } from "react-router-dom";
import { CircleCheck, Package } from "lucide-react";
import type { Product } from "../../types/types";
import "./lowStockPanel.css";

interface LowStockPanelProps {
  lowStock: Product[] | null;
  threshold: number;
  error?: string;
  // Quantos itens mostrar antes de resumir o restante.
  limit?: number;
}

const number = new Intl.NumberFormat("pt-BR");

// Lista curta do que precisa de reposição; o detalhe completo fica na tela Produtos.
export default function LowStockPanel({ lowStock, threshold, error, limit = 6 }: LowStockPanelProps) {
  const visible = lowStock?.slice(0, limit) ?? [];
  const hidden = lowStock ? lowStock.length - visible.length : 0;

  return (
    <section className="panel low-stock" aria-labelledby="low-stock-title">
      <header className="panel-header">
        <div>
          <h2 id="low-stock-title" className="section-title">Precisa de reposição</h2>
          <p className="section-hint">Abaixo de {number.format(threshold)} {threshold === 1 ? "unidade" : "unidades"}</p>
        </div>
        {lowStock && lowStock.length > 0 && <span className="tag tag-warning">{number.format(lowStock.length)}</span>}
      </header>

      {error ? (
        <p className="low-stock-state" role="alert">{error}</p>
      ) : lowStock === null ? (
        <p className="low-stock-state" role="status"><span className="low-stock-spinner" aria-hidden="true" />Carregando…</p>
      ) : lowStock.length === 0 ? (
        <p className="low-stock-state is-ok"><CircleCheck size={18} aria-hidden="true" />Nenhum produto abaixo do limite.</p>
      ) : (
        <ul className="low-stock-list">
          {visible.map((product) => {
            const quantity = Number(product.stockQuantity);
            return (
              <li key={product.productId} className="low-stock-item">
                <span className="low-stock-thumb" aria-hidden="true">
                  {product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" /> : <Package size={16} strokeWidth={1.6} />}
                </span>
                <span className="low-stock-name">{product.name}</span>
                {quantity <= 0
                  ? <span className="tag tag-danger">Sem estoque</span>
                  : <span className="low-stock-qty">{number.format(quantity)}<small>un.</small></span>}
              </li>
            );
          })}
        </ul>
      )}

      {lowStock && lowStock.length > 0 && (
        <footer className="low-stock-footer">
          <Link to="/productScreen" className="low-stock-link">
            {hidden > 0 ? `Ver todos os ${number.format(lowStock.length)} produtos` : "Ver produtos"}
          </Link>
        </footer>
      )}
    </section>
  );
}
