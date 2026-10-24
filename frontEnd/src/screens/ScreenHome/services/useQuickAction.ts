import { getUserId } from "../../../services/getUserData";
import { emptyProductForm, type ProductForm } from "../../screenProducts/services/product";
import { getErrorMessage, formatPriceInput, parsePriceInput } from "../../../services/screenUtils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Category, Product, Supplier } from "../../../resources/types/types";
import { CategoryService } from "../../../services/categoriesService";
import { isActiveProduct, ProductService } from "../../../services/productService";
import { SupplierService } from "../../screenSupliers/services/suppliers";
import { createStockInput } from "../../screenInputs/services/input";
import { createStockOutput } from "../../screenOutputs/services/output";

export type QuickAction = "input" | "output" | "product" | "supplier";

export interface QuickActionModalProps {
  action: QuickAction | null;
  onClose: () => void;
  onCompleted?: () => void;
}

interface MovementItem { productId: string; quantity: string; }

const emptyMovement = { productId: "", quantity: "" };

const SUCCESS_MESSAGES: Record<QuickAction, string> = {
  input: "Entrada registrada.",
  output: "Saída registrada.",
  product: "Produto adicionado.",
  supplier: "Fornecedor adicionado.",
};

// Reúne as quatro ações rápidas e só sinaliza conclusão após um envio válido.
export function useQuickAction({ action, onClose, onCompleted }: QuickActionModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [movementItems, setMovementItems] = useState<MovementItem[]>([]);
  const [movement, setMovement] = useState(emptyMovement);
  const [observation, setObservation] = useState("");
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [supplierForm, setSupplierForm] = useState({ name: "", email: "", phone: "" });
  const [formError, setFormError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!action) return;
    const loadOptions = async () => {
      try {
        const [loadedCategories, loadedSuppliers, loadedProducts] = await Promise.all([CategoryService.getAll(), SupplierService.getAll(), ProductService.getAll()]);
        setCategories(loadedCategories); setSuppliers(loadedSuppliers); setProducts(loadedProducts.filter(isActiveProduct));
      } catch (error: unknown) { setRequestError(getErrorMessage(error, "Não foi possível carregar os dados do formulário.")); }
    };
    void loadOptions();
    setFormError(""); setMovementItems([]); setMovement(emptyMovement); setObservation("");
    setProductForm(emptyProductForm);
    setSupplierForm({ name: "", email: "", phone: "" });
  }, [action]);

  const close = () => { if (!isSaving) onClose(); };

  const title = action === "input" ? "Nova entrada de estoque" : action === "output" ? "Nova saída de estoque" : action === "product" ? "Adicionar produto" : "Adicionar fornecedor";

  const description = action === "input" ? "Registre rapidamente os produtos recebidos." : action === "output" ? "Registre rapidamente os produtos retirados." : undefined;

  const addMovementItem = () => {
    const selectedProduct = products.find((product) => product.productId === Number(movement.productId));
    const quantity = Number(movement.quantity);
    if (!selectedProduct || !Number.isInteger(quantity) || quantity <= 0) { setFormError("Selecione um produto e informe uma quantidade inteira maior que zero."); return; }
    if (action === "output" && selectedProduct.stockQuantity < quantity) { setFormError(`Estoque insuficiente. Disponível: ${selectedProduct.stockQuantity}.`); return; }
    if (movementItems.some((item) => item.productId === movement.productId)) { setFormError("Esse produto já foi adicionado."); return; }
    setMovementItems((current) => [...current, movement]); setMovement(emptyMovement); setFormError("");
  };

  const submitMovement = async () => {
    const userId = getUserId();
    if (!userId) { setFormError("Usuário autenticado não encontrado."); return false; }
    if (!movementItems.length) { setFormError("Adicione pelo menos um produto."); return false; }
    const productsPayload = movementItems.map((item) => ({ productId: Number(item.productId), productQuantity: Number(item.quantity) }));
    if (action === "input") await createStockInput({ stockInput: { userId, observation: observation.trim() || null }, products: productsPayload });
    else await createStockOutput({ stockOutput: { userId, observation: observation.trim() || null }, products: productsPayload });
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setFormError("");
    try {
      setIsSaving(true);
      if ((action === "input" || action === "output") && !await submitMovement()) return;
      if (action === "supplier") {
        if (supplierForm.name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(supplierForm.email.trim())) { setFormError("Informe nome e e-mail válidos."); return; }
        await SupplierService.create({ name: supplierForm.name.trim(), email: supplierForm.email.trim(), phone: supplierForm.phone.trim() });
      }
      if (action === "product") {
        const price = parsePriceInput(productForm.price);
        if (productForm.name.trim().length < 2 || !productForm.categoryId || !productForm.price || !Number.isFinite(price) || price < 0 || Number(productForm.stockQuantity) < 0) { setFormError("Informe nome, categoria, preço e estoque válidos."); return; }
        await ProductService.create({ name: productForm.name.trim(), sku: productForm.sku.trim() || null, unit: productForm.unit, description: productForm.description.trim() || null, price, stockQuantity: Number(productForm.stockQuantity), categoryId: Number(productForm.categoryId), supplierId: productForm.supplierId ? Number(productForm.supplierId) : null }, productForm.image);
      }
      toast.success(SUCCESS_MESSAGES[action as QuickAction]);
      onCompleted?.(); onClose();
    } catch (error: unknown) { setRequestError(getErrorMessage(error, "Não foi possível concluir a ação.")); }
    finally { setIsSaving(false); }
  };
  return { categories, suppliers, products, movementItems, setMovementItems, movement, setMovement, observation, setObservation, productForm, setProductForm, supplierForm, setSupplierForm, formError, requestError, setRequestError, isSaving, close, title, description, addMovementItem, handleSubmit, formatPriceInput };
}
