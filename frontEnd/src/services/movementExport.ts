import type { MovementKind, Product } from "../resources/types/types";
import { movementKindLabel } from "../resources/components/movementLedger/MovementKindTags";
import { csvDate, csvFilename, downloadCsv } from "./csvExport";
import { unitLabel } from "./productService";

interface ExportableMovement { observation: string | null; createdAt: string; kind?: MovementKind; reversedById?: number | null; }
interface ExportableItem { productId: number; quantity: number; unitPrice?: number | null; }

// Uma linha por produto de cada movimentação, na ordem e com os filtros da tela.
export function exportMovementsCsv<T extends ExportableMovement>(
  type: "input" | "output",
  movements: T[],
  getId: (movement: T) => number,
  itemsByMovement: Map<number, ExportableItem[]>,
  products: Product[],
) {
  const productById = new Map(products.map((product) => [product.productId, product]));
  const rows = movements.flatMap((movement) => {
    const id = getId(movement);
    return (itemsByMovement.get(id) ?? []).map((item) => {
      const product = productById.get(item.productId);
      return [
        csvDate(movement.createdAt),
        id,
        movementKindLabel(type, movement.kind),
        movement.reversedById ? `Estornada (#${movement.reversedById})` : "",
        product?.sku ?? "",
        product?.name ?? `Produto #${item.productId}`,
        Number(item.quantity),
        product ? unitLabel(product) : "",
        ...(type === "input" ? [item.unitPrice == null ? "" : Number(item.unitPrice)] : []),
        movement.observation ?? "",
      ];
    });
  });

  const headers = ["Data", "Número", "Tipo", "Situação", "Código", "Produto", "Quantidade", "Unidade",
    ...(type === "input" ? ["Preço unitário (R$)"] : []), "Observação"];
  downloadCsv(csvFilename(type === "input" ? "entradas" : "saidas"), headers, rows);
}
