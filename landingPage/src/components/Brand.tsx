import { Box } from "lucide-react";

// Marca: quadrado amarelo de segurança com a caixa e o nome em estêncil, igual ao sistema.
export default function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true"><Box size={18} strokeWidth={2.2} /></span>
      <span className="brand-name">StockControl</span>
    </span>
  );
}
