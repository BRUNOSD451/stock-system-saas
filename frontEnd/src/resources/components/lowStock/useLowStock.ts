import { useCallback, useEffect, useState } from "react";
import type { Product } from "../../types/types";
import { isActiveProduct, ProductService } from "../../../services/productService";
import { CompanyService } from "../../../services/companyService";
import { getCompanyData } from "../../../services/getUserData";
import { getErrorMessage } from "../../../services/screenUtils";

// Produtos abaixo do limite de estoque baixo da empresa (tela Empresa), do menor saldo ao maior.
export function useLowStock() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [threshold, setThreshold] = useState(() => getCompanyData()?.lowStockThreshold ?? 10);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const loaded = await ProductService.getAll();
      setProducts(loaded);
      setError("");
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Não foi possível carregar os produtos."));
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void reload(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [reload]);

  // O limite salvo no login pode estar desatualizado; falha aqui mantém o valor salvo.
  useEffect(() => {
    let active = true;
    CompanyService.getMine()
      .then((company) => { if (active && typeof company.lowStockThreshold === "number") setThreshold(company.lowStockThreshold); })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  // Inativos não precisam de reposição: ficam fora da lista.
  const lowStock = products
    ?.filter((product) => isActiveProduct(product) && Number(product.stockQuantity) < threshold)
    .sort((a, b) => Number(a.stockQuantity) - Number(b.stockQuantity) || a.name.localeCompare(b.name, "pt-BR")) ?? null;

  return { lowStock, threshold, error, reload };
}
