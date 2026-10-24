import { getUserId } from "../../../services/getUserData";
import { getErrorMessage as message, dateLabel } from "../../../services/screenUtils";
import { useEffect, useMemo, useState } from "react";
import type { OutputItem, Product, StockOutput } from "../../../resources/types/types";
import { toast } from "sonner";
import { createStockOutput, getOutputItems, getProducts, getStockOutputs, reverseStockOutput } from "../services/output";
import { groupItems, useMovementFilters } from "../../../services/movementFilters";
import { exportMovementsCsv } from "../../../services/movementExport";
import { isActiveProduct } from "../../../services/productService";

interface SelectedItem { productId: number; quantity: number; }

const emptyForm = { productId: "", quantity: "", observation: "" };

const outputId = (output: StockOutput) => output.stockOutputId;
const itemOutputId = (item: OutputItem) => item.stockOutputId;

// Centraliza estado, validações e chamadas da tela, preservando os contratos da API.
export function useOutputScreen() {
  const [outputs, setOutputs] = useState<StockOutput[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  // Itens só servem ao filtro por produto: se falharem, a lista continua e o filtro fica desativado.
  const [items, setItems] = useState<OutputItem[] | null>(null);

  async function loadData() {
    getOutputItems().then(setItems).catch(() => setItems(null));
    try {
      const [loadedOutputs, loadedProducts] = await Promise.all([getStockOutputs(), getProducts()]);
      setOutputs(loadedOutputs); setProducts(loadedProducts);
    } catch (requestError: unknown) { setError(message(requestError, "Não foi possível carregar as saídas.")); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { const id = window.setTimeout(() => { void loadData(); }, 0); return () => window.clearTimeout(id); }, []);

  const productName = (id: number) => products.find((product) => product.productId === id)?.name || `Produto #${id}`;

  const itemsByOutput = useMemo(() => (items ? groupItems(items, itemOutputId) : null), [items]);
  const filters = useMovementFilters(outputs, outputId, itemsByOutput);
  const groupedOutputs = filters.filtered.map((output) => ({ output }));

  const resetForm = () => { setForm(emptyForm); setSelectedItems([]); setFormError(""); setIsOpen(false); };

  const addItem = () => {
    const productId = Number(form.productId); const quantity = Number(form.quantity); const product = products.find((item) => item.productId === productId);
    if (!productId || !Number.isInteger(quantity) || quantity <= 0) { setFormError("Selecione um produto e informe uma quantidade inteira maior que zero."); return; }
    if (!product || product.stockQuantity < quantity) { setFormError(`Estoque insuficiente. Disponível: ${product?.stockQuantity ?? 0}.`); return; }
    if (selectedItems.some((item) => item.productId === productId)) { setFormError("Esse produto já foi adicionado à saída."); return; }
    setSelectedItems((current) => [...current, { productId, quantity }]); setForm({ ...form, productId: "", quantity: "" }); setFormError("");
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userId = getUserId();
    if (!userId) { setError("Usuário autenticado não encontrado."); return; }
    if (!selectedItems.length) { setFormError("Adicione pelo menos um produto."); return; }
    try { setSaving(true); await createStockOutput({ stockOutput: { userId, observation: form.observation.trim() || null }, products: selectedItems.map((item) => ({ productId: item.productId, productQuantity: item.quantity })) }); resetForm(); toast.success("Saída registrada."); await loadData(); }
    catch (requestError: unknown) { setError(message(requestError, "Não foi possível registrar a saída.")); }
    finally { setSaving(false); }
  };

  // Estorno pede confirmação; a lista é recarregada para mostrar a saída como estornada.
  const [reverseTarget, setReverseTarget] = useState<StockOutput | null>(null);
  const confirmReverse = async () => {
    if (!reverseTarget) return;
    try {
      const result = await reverseStockOutput(reverseTarget.stockOutputId);
      toast.success(`Saída #${reverseTarget.stockOutputId} estornada pela entrada #${result.stockInputId}.`);
      await loadData();
    } catch (requestError: unknown) {
      setError(message(requestError, "Não foi possível estornar a saída."));
    } finally {
      setReverseTarget(null);
    }
  };

  // Nova saída só oferece produtos ativos; o histórico e os filtros continuam com todos.
  const activeProducts = products.filter(isActiveProduct);
  const exportCsv = () => { if (itemsByOutput) exportMovementsCsv("output", filters.filtered, outputId, itemsByOutput, products); };

  return { reverseTarget, setReverseTarget, confirmReverse, activeProducts, exportCsv, filters, totalOutputs: outputs.length, itemsAvailable: items !== null, emptyForm, dateLabel, products, form, setForm, selectedItems, setSelectedItems, isOpen, setIsOpen, isLoading, saving, error, setError, formError, setFormError, productName, groupedOutputs, resetForm, addItem, handleCreate };
}
