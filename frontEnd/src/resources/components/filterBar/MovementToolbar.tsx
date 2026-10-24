import { Search, X } from "lucide-react";
import type { Product } from "../../types/types";
import FilterSelect from "./FilterSelect";
import {
  MOVEMENT_PERIOD_OPTIONS, MOVEMENT_SORT_OPTIONS,
  type MovementPeriod, type MovementSort, type useMovementFilters,
} from "../../../services/movementFilters";

interface MovementToolbarProps {
  filters: Pick<ReturnType<typeof useMovementFilters>, "search" | "setSearch" | "period" | "setPeriod" | "productId" | "setProductId" | "sort" | "setSort" | "hasActiveFilters" | "clearFilters">;
  products: Product[];
  shown: number;
  total: number;
  // Sem os itens das movimentações não há como filtrar por produto.
  itemsAvailable: boolean;
  noun: { singular: string; plural: string };
}

// Busca, período, produto e ordenação das telas de Entradas e Saídas.
export default function MovementToolbar({ filters, products, shown, total, itemsAvailable, noun }: MovementToolbarProps) {
  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  return (
    <div className="page-toolbar">
      <label className="search-field">
        <Search size={16} aria-hidden />
        <span className="sr-only">Pesquisar {noun.plural}</span>
        <input type="search" placeholder="Número ou observação" value={filters.search} onChange={(event) => filters.setSearch(event.target.value)} />
      </label>
      <FilterSelect label="Período" value={filters.period} defaultValue="all" options={MOVEMENT_PERIOD_OPTIONS}
        onChange={(value) => filters.setPeriod(value as MovementPeriod)} />
      <FilterSelect label="Produto" value={filters.productId} defaultValue="all" disabled={!itemsAvailable}
        options={[{ value: "all", label: "Todos" }, ...sortedProducts.map((product) => ({ value: String(product.productId), label: product.name }))]}
        onChange={filters.setProductId} />
      <FilterSelect label="Ordenar" value={filters.sort} options={MOVEMENT_SORT_OPTIONS}
        onChange={(value) => filters.setSort(value as MovementSort)} />
      {filters.hasActiveFilters && (
        <button type="button" className="btn btn-ghost btn-sm filter-clear" onClick={filters.clearFilters}><X size={14} aria-hidden /> Limpar filtros</button>
      )}
      <span className="result-count" aria-live="polite">
        {filters.hasActiveFilters ? `${shown} de ${total}` : total} {total === 1 ? noun.singular : noun.plural}
      </span>
    </div>
  );
}
