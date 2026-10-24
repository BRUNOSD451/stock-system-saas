import { getErrorMessage as errorMessage, formatPrice, formatPriceInput, parsePriceInput } from "../../../services/screenUtils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Category, Product, Supplier, User } from "../../../resources/types/types";
import { isActiveProduct, ProductService, unitLabel } from "../../../services/productService";
import { csvFilename, downloadCsv } from "../../../services/csvExport";
import { CategoryService } from "../../../services/categoriesService";
import { SupplierService } from "../../screenSupliers/services/suppliers";
import getUserData, { getCompanyData } from "../../../services/getUserData";
import { CompanyService } from "../../../services/companyService";

export type ProductForm = { name: string; sku: string; description: string; price: string; stockQuantity: string; unit: string; categoryId: string; supplierId: string; image: File | null; };

export const emptyProductForm: ProductForm = { name: "", sku: "", description: "", price: "", stockQuantity: "0", unit: "un", categoryId: "", supplierId: "", image: null };
const emptyForm = emptyProductForm;

// Situação do estoque: "restock" reúne estoque baixo e zerado (tudo o que precisa de reposição).
export type StockFilter = "all" | "restock" | "out" | "ok";
// Produtos inativos ficam fora da lista padrão, mas continuam consultáveis.
export type ActiveFilter = "active" | "inactive" | "all";
export type ProductSort = "name-asc" | "name-desc" | "stock-asc" | "stock-desc" | "price-asc" | "price-desc";
export interface ProductFilters { category: string; supplier: string; stock: StockFilter; status: ActiveFilter; }

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = { category: "all", supplier: "all", stock: "all", status: "active" };
export const DEFAULT_PRODUCT_SORT: ProductSort = "name-asc";

const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
const PRODUCT_SORTERS: Record<ProductSort, (a: Product, b: Product) => number> = {
  "name-asc": byName,
  "name-desc": (a, b) => byName(b, a),
  "stock-asc": (a, b) => Number(a.stockQuantity) - Number(b.stockQuantity) || byName(a, b),
  "stock-desc": (a, b) => Number(b.stockQuantity) - Number(a.stockQuantity) || byName(a, b),
  "price-asc": (a, b) => Number(a.price) - Number(b.price) || byName(a, b),
  "price-desc": (a, b) => Number(b.price) - Number(a.price) || byName(a, b),
};

// Centraliza estado, validações e chamadas da tela, preservando os contratos da API.
export function useProductScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_PRODUCT_FILTERS);
  const [sort, setSort] = useState<ProductSort>(DEFAULT_PRODUCT_SORT);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [userData] = useState<User | null>(getUserData);
  // Limite definido na tela Empresa; enquanto carrega, usa o salvo no login.
  const [lowStockThreshold, setLowStockThreshold] = useState(() => getCompanyData()?.lowStockThreshold ?? 10);

  async function loadData() {
    try {
      const [loadedProducts, loadedCategories, loadedSuppliers] = await Promise.all([ProductService.getAll(), CategoryService.getAll(), SupplierService.getAll()]);
      setProducts(loadedProducts);
      setCategories(loadedCategories);
      setSuppliers(loadedSuppliers);
    } catch (requestError: unknown) {
      setError(errorMessage(requestError, "Não foi possível carregar os produtos."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadData(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  // Falha aqui não impede a tela: o valor do login continua valendo.
  useEffect(() => {
    let active = true;
    CompanyService.getMine()
      .then((company) => { if (active && typeof company.lowStockThreshold === "number") setLowStockThreshold(company.lowStockThreshold); })
      .catch((requestError: unknown) => console.error("Error loading company settings:", requestError));
    return () => { active = false; };
  }, []);

  const closeModals = () => { setIsAddOpen(false); setIsEditOpen(false); setEditingProduct(null); setFormError(""); };

  const openAdd = () => { setForm(emptyForm); setFormError(""); setIsAddOpen(true); };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({ name: product.name, sku: product.sku ?? "", description: product.description || "", price: formatPriceInput(product.price), stockQuantity: String(product.stockQuantity), unit: unitLabel(product), categoryId: String(product.categoryId), supplierId: product.supplierId ? String(product.supplierId) : "", image: null });
    setFormError("");
    setIsEditOpen(true);
  };

  const validate = () => {
    if (form.name.trim().length < 2) return "Informe um nome com pelo menos 2 caracteres.";
    if (!form.categoryId) return "Selecione uma categoria.";
    const price = parsePriceInput(form.price);
    if (!form.price || !Number.isFinite(price) || price < 0) return "Informe um preço válido.";
    if (!Number.isInteger(Number(form.stockQuantity)) || Number(form.stockQuantity) < 0) return "Informe um estoque inteiro válido.";
    return "";
  };

  // Campos editáveis; o saldo só entra no cadastro (requestData), nunca na edição.
  const editableData = () => ({ name: form.name.trim(), sku: form.sku.trim() || null, description: form.description.trim() || null, price: parsePriceInput(form.price), unit: form.unit, categoryId: Number(form.categoryId), supplierId: form.supplierId ? Number(form.supplierId) : null });
  const requestData = () => ({ ...editableData(), stockQuantity: Number(form.stockQuantity) });

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const validationError = validate(); if (validationError) { setFormError(validationError); return; }
    try { setIsSaving(true); const created = await ProductService.create(requestData(), form.image); setProducts((current) => [...current, created]); closeModals(); toast.success("Produto adicionado."); }
    catch (requestError: unknown) { setError(errorMessage(requestError, "Não foi possível adicionar o produto.")); }
    finally { setIsSaving(false); }
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editingProduct) return; const validationError = validate(); if (validationError) { setFormError(validationError); return; }
    // O saldo não vai na edição: depois do cadastro, ele só muda por movimentação ou ajuste de inventário.
    try { setIsSaving(true); const updated = await ProductService.update(editableData(), editingProduct.productId, form.image); setProducts((current) => current.map((item) => item.productId === updated.productId ? updated : item)); closeModals(); toast.success("Alterações salvas."); }
    catch (requestError: unknown) { setError(errorMessage(requestError, "Não foi possível editar o produto.")); }
    finally { setIsSaving(false); }
  };

  const stockStatus = (product: Product) => {
    const quantity = Number(product.stockQuantity);
    return quantity <= 0 ? "out" : quantity < lowStockThreshold ? "low" : "ok";
  };

  const term = search.toLowerCase().trim();
  const filteredProducts = products
    .filter((product) => !term || [product.name, product.sku || "", product.description || ""].join(" ").toLowerCase().includes(term))
    .filter((product) => filters.status === "all" || (filters.status === "active") === isActiveProduct(product))
    .filter((product) => filters.category === "all" || String(product.categoryId) === filters.category)
    .filter((product) => filters.supplier === "all"
      || (filters.supplier === "none" ? product.supplierId == null : String(product.supplierId) === filters.supplier))
    .filter((product) => {
      const status = stockStatus(product);
      return filters.stock === "all" || (filters.stock === "restock" ? status !== "ok" : status === filters.stock);
    })
    .sort(PRODUCT_SORTERS[sort]);

  const setFilter = <K extends keyof ProductFilters>(key: K, value: ProductFilters[K]) => setFilters((current) => ({ ...current, [key]: value }));
  // Limpar devolve a lista inteira; a ordenação escolhida é mantida.
  const hasActiveFilters = !!term || (Object.keys(DEFAULT_PRODUCT_FILTERS) as (keyof ProductFilters)[]).some((key) => filters[key] !== DEFAULT_PRODUCT_FILTERS[key]);
  const clearFilters = () => { setSearch(""); setFilters(DEFAULT_PRODUCT_FILTERS); };

  const replaceProduct = (updated: Product) => setProducts((current) => current.map((item) => item.productId === updated.productId ? updated : item));

  // ── Ajuste de inventário ────────────────────────────────────────────────────
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustForm, setAdjustForm] = useState({ counted: "", reason: "" });
  const [adjustError, setAdjustError] = useState("");

  const openAdjust = (product: Product) => {
    setAdjustingProduct(product);
    setAdjustForm({ counted: String(product.stockQuantity), reason: "" });
    setAdjustError("");
  };
  const closeAdjust = () => { if (!isSaving) setAdjustingProduct(null); };

  const handleAdjust = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adjustingProduct) return;
    const counted = Number(adjustForm.counted);
    if (adjustForm.counted.trim() === "" || !Number.isInteger(counted) || counted < 0) { setAdjustError("Informe a quantidade contada, um número inteiro de 0 para cima."); return; }
    if (counted === Number(adjustingProduct.stockQuantity)) { setAdjustError("A quantidade contada é igual ao saldo atual: não há o que ajustar."); return; }
    if (adjustForm.reason.trim().length < 3) { setAdjustError("Informe o motivo do ajuste."); return; }
    try {
      setIsSaving(true); setAdjustError("");
      const result = await ProductService.adjust(adjustingProduct.productId, counted, adjustForm.reason.trim());
      replaceProduct({ ...adjustingProduct, stockQuantity: result.newStock });
      setAdjustingProduct(null);
      toast.success(`Estoque ajustado: ${result.previousStock} → ${result.newStock} ${unitLabel(adjustingProduct)}.`);
    } catch (requestError: unknown) {
      setAdjustError(errorMessage(requestError, "Não foi possível registrar o ajuste."));
    } finally { setIsSaving(false); }
  };

  // ── Inativar e reativar ─────────────────────────────────────────────────────
  // Inativar pede confirmação; reativar é imediato.
  const [deactivating, setDeactivating] = useState<Product | null>(null);

  const setProductActive = async (product: Product, active: boolean) => {
    try {
      const updated = await ProductService.setActive(product.productId, active);
      replaceProduct(updated);
      toast.success(active ? `${product.name} foi reativado.` : `${product.name} foi inativado.`);
    } catch (requestError: unknown) {
      setError(errorMessage(requestError, "Não foi possível alterar a situação do produto."));
    }
  };
  const toggleActive = (product: Product) => {
    if (isActiveProduct(product)) setDeactivating(product);
    else void setProductActive(product, true);
  };
  const confirmDeactivate = async () => {
    if (!deactivating) return;
    await setProductActive(deactivating, false);
    setDeactivating(null);
  };

  // ── Exportação ──────────────────────────────────────────────────────────────
  // Exporta exatamente o que está na tela (busca, filtros e ordenação aplicados).
  const exportCsv = () => {
    const stockLabel = { out: "Sem estoque", low: "Estoque baixo", ok: "Em estoque" } as const;
    downloadCsv(csvFilename("produtos"),
      ["Código", "Produto", "Descrição", "Categoria", "Fornecedor", "Unidade", "Preço (R$)", "Estoque", "Situação do estoque", "Ativo"],
      filteredProducts.map((product) => [
        product.sku ?? "",
        product.name,
        product.description ?? "",
        categories.find((category) => category.categoryId === product.categoryId)?.name ?? "",
        suppliers.find((supplier) => supplier.supplierId === product.supplierId)?.name ?? "",
        unitLabel(product),
        Number(product.price),
        Number(product.stockQuantity),
        stockLabel[stockStatus(product)],
        isActiveProduct(product) ? "Sim" : "Não",
      ]));
  };

  return { adjustingProduct, adjustForm, setAdjustForm, adjustError, openAdjust, closeAdjust, handleAdjust, deactivating, setDeactivating, toggleActive, confirmDeactivate, exportCsv, lowStockThreshold, formatPrice, formatPriceInput, categories, suppliers, search, setSearch, filters, setFilter, sort, setSort, hasActiveFilters, clearFilters, totalProducts: products.length, form, setForm, editingProduct, isAddOpen, isEditOpen, isLoading, isSaving, error, setError, formError, userData, closeModals, openAdd, handleEdit, handleCreate, handleUpdate, filteredProducts };
}
