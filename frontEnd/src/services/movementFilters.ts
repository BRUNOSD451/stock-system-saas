import { useMemo, useState } from "react";
import type { FilterOption } from "../resources/components/filterBar/FilterSelect";

// Filtros das telas de Entradas e Saídas, que listam movimentações com a mesma estrutura.
export type MovementPeriod = "all" | "today" | "7d" | "30d" | "month";
export type MovementSort = "recent" | "oldest";

export const MOVEMENT_PERIOD_OPTIONS: FilterOption[] = [
  { value: "all", label: "Todo o período" },
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "month", label: "Este mês" },
];

export const MOVEMENT_SORT_OPTIONS: FilterOption[] = [
  { value: "recent", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigas" },
];

// Início do período no horário local; "7 dias" inclui hoje e os 6 dias anteriores.
function periodStart(period: MovementPeriod, now = new Date()): number | null {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (period === "today") return start.getTime();
  if (period === "7d") return start.setDate(start.getDate() - 6);
  if (period === "30d") return start.setDate(start.getDate() - 29);
  if (period === "month") return start.setDate(1);
  return null;
}

interface MovementItemRef { productId: number; }

export function useMovementFilters<T extends { observation: string | null; createdAt: string }>(
  movements: T[],
  getId: (movement: T) => number,
  // Itens de cada movimentação (para filtrar por produto); null enquanto não carregaram.
  itemsByMovement: Map<number, MovementItemRef[]> | null,
) {
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<MovementPeriod>("all");
  const [productId, setProductId] = useState("all");
  const [sort, setSort] = useState<MovementSort>("recent");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase().replace(/^#/, "");
    const from = periodStart(period);
    const selectedProduct = Number(productId);
    return movements
      .filter((movement) => !term || String(getId(movement)) === term || (movement.observation ?? "").toLowerCase().includes(term))
      .filter((movement) => from === null || new Date(movement.createdAt).getTime() >= from)
      .filter((movement) => productId === "all" || !itemsByMovement
        || (itemsByMovement.get(getId(movement)) ?? []).some((item) => item.productId === selectedProduct))
      .sort((a, b) => {
        const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || getId(a) - getId(b);
        return sort === "recent" ? -diff : diff;
      });
  }, [movements, getId, itemsByMovement, search, period, productId, sort]);

  const hasActiveFilters = !!search.trim() || period !== "all" || productId !== "all";
  const clearFilters = () => { setSearch(""); setPeriod("all"); setProductId("all"); };

  return { search, setSearch, period, setPeriod, productId, setProductId, sort, setSort, filtered, hasActiveFilters, clearFilters };
}

// Agrupa os itens pela movimentação a que pertencem.
export function groupItems<I extends MovementItemRef>(items: I[], getMovementId: (item: I) => number) {
  const map = new Map<number, I[]>();
  for (const item of items) {
    const id = getMovementId(item);
    map.set(id, [...(map.get(id) ?? []), item]);
  }
  return map;
}
