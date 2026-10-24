import { getUserId } from "../../../services/getUserData";
import { getErrorMessage as message, dateLabel } from "../../../services/screenUtils";
import { useEffect, useMemo, useState } from "react";
import type { InputItem, Product, StockInput } from "../../../resources/types/types";
import { toast } from "sonner";
import { createStockInput, getInputItems, getProducts, getStockInputs, reverseStockInput } from "../services/input";
import { groupItems, useMovementFilters } from "../../../services/movementFilters";
import { exportMovementsCsv } from "../../../services/movementExport";
import { isActiveProduct } from "../../../services/productService";

interface SelectedItem { productId: number; quantity: number; }

const emptyForm = { productId: "", quantity: "", observation: "" };

const inputId = (input: StockInput) => input.stockInputId;
const itemInputId = (item: InputItem) => item.stockInputId;

// Centraliza estado, validações e chamadas da tela, preservando os contratos da API.
export function useInputScreen() {
  const [inputs, setInputs] = useState<StockInput[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  // Itens só servem ao filtro por produto: se falharem, a lista continua e o filtro fica desativado.
  const [items, setItems] = useState<InputItem[] | null>(null);

  async function loadData() {
    getInputItems().then(setItems).catch(() => setItems(null));
    try {
      const [loadedInputs, loadedProducts] = await Promise.all([getStockInputs(), getProducts()]);
      setInputs(loadedInputs); setProducts(loadedProducts);
    } catch (requestError: unknown) { setError(message(requestError, "Não foi possível carregar as entradas.")); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { const id = window.setTimeout(() => { void loadData(); }, 0); return () => window.clearTimeout(id); }, []);

  const productName = (id: number) => products.find((product) => product.productId === id)?.name || `Produto #${id}`;

  const itemsByInput = useMemo(() => (items ? groupItems(items, itemInputId) : null), [items]);
  const filters = useMovementFilters(inputs, inputId, itemsByInput);
  const groupedInputs = filters.filtered.map((input) => ({ input }));

  const resetForm = () => { setForm(emptyForm); setSelectedItems([]); setFormError(""); setIsOpen(false); };

  const addItem = () => {
    const productId = Number(form.productId); const quantity = Number(form.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity <= 0) { setFormError("Selecione um produto e informe uma quantidade inteira maior que zero."); return; }
    if (selectedItems.some((item) => item.productId === productId)) { setFormError("Esse produto já foi adicionado à entrada."); return; }
    setSelectedItems((current) => [...current, { productId, quantity }]); setForm({ ...form, productId: "", quantity: "" }); setFormError("");
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userId = getUserId();
    if (!userId) { setError("Usuário autenticado não encontrado."); return; }
    if (!selectedItems.length) { setFormError("Adicione pelo menos um produto."); return; }
    try { setSaving(true); await createStockInput({ stockInput: { userId, observation: form.observation.trim() || null }, products: selectedItems.map((item) => ({ productId: item.productId, productQuantity: item.quantity })) }); resetForm(); toast.success("Entrada registrada."); await loadData(); }
    catch (requestError: unknown) { setError(message(requestError, "Não foi possível registrar a entrada.")); }
    finally { setSaving(false); }
  };

  // Estorno pede confirmação; a lista é recarregada para mostrar a entrada como estornada.
  const [reverseTarget, setReverseTarget] = useState<StockInput | null>(null);
  const confirmReverse = async () => {
    if (!reverseTarget) return;
    try {
      const result = await reverseStockInput(reverseTarget.stockInputId);
      toast.success(`Entrada #${reverseTarget.stockInputId} estornada pela saída #${result.stockOutputId}.`);
      await loadData();
    } catch (requestError: unknown) {
      setError(message(requestError, "Não foi possível estornar a entrada."));
    } finally {
      setReverseTarget(null);
    }
  };

  // Nova entrada só oferece produtos ativos; o histórico e os filtros continuam com todos.
  const activeProducts = products.filter(isActiveProduct);
  const exportCsv = () => { if (itemsByInput) exportMovementsCsv("input", filters.filtered, inputId, itemsByInput, products); };

  return { reverseTarget, setReverseTarget, confirmReverse, activeProducts, exportCsv, filters, totalInputs: inputs.length, itemsAvailable: items !== null, emptyForm, dateLabel, products, form, setForm, selectedItems, setSelectedItems, isOpen, setIsOpen, isLoading, saving, error, setError, formError, setFormError, productName, groupedInputs, resetForm, addItem, handleCreate };
}
