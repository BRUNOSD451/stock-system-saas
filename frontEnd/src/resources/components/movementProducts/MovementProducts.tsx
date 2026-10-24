import { useEffect, useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getStockInput } from "../../../screens/screenInputs/services/input";
import { getStockOutput } from "../../../screens/screenOutputs/services/output";
import type { InputItemDetalhado, OutputItemDetalhado } from "../../types/types";
import "./movementProducts.css";

export default function MovementProducts({ id, type }: { id: number; type: "input" | "output" }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<(InputItemDetalhado | OutputItemDetalhado)[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const contentId = useId();

  useEffect(() => {
    if (!open) return;
    let active = true;
    const request = type === "input" ? getStockInput(id) : getStockOutput(id);
    request.then(data => { if (active) setItems(data.items); }).catch(() => {
      if (active) setError("Não foi possível carregar os produtos desta movimentação.");
    });
    return () => { active = false; };
  }, [id, type, open, attempt]);

  return <div className={`movement-products ${type === "input" ? "is-in" : "is-out"}`}>
    <button type="button" className="btn btn-ghost btn-sm movement-products-toggle" aria-expanded={open} aria-controls={contentId} onClick={() => {
      setItems(null); setError(""); setOpen(value => !value);
    }}><ChevronDown size={16} aria-hidden="true" />{open ? "Ocultar produtos" : "Ver produtos"}</button>
    {open && <div id={contentId} className="movement-products-content" aria-live="polite">
      {error ? <div className="movement-products-error" role="alert"><p>{error}</p><button type="button" className="btn btn-secondary btn-sm" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Tentar novamente</button></div>
        : items === null ? <p className="movement-products-state" role="status">Carregando produtos...</p>
        : items.length === 0 ? <p className="movement-products-state">Nenhum item nesta movimentação.</p>
        : <ul className="movement-products-list">{items.map(item => <li className="movement-product-detail" key={"inputItemId" in item ? item.inputItemId : item.outputItemId}>
          <div><strong>{item.product?.name || `Produto #${item.productId} (indisponível)`}</strong>
            {item.product?.description && <p>{item.product.description}</p>}
            {"unitPrice" in item && item.unitPrice != null && <small>Preço unitário da entrada: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(item.unitPrice)}</small>}
          </div>
          <span className="movement-product-qty">{type === "input" ? "+" : "−"}{item.quantity}<small>un.</small></span>
        </li>)}</ul>}
    </div>}
  </div>;
}
