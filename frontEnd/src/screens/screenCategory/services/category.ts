import { getErrorMessage as errorMessage } from "../../../services/screenUtils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Category } from "../../../resources/types/types";
import { CategoryService } from "../../../services/categoriesService";

const emptyForm = { name: "" };

// Centraliza estado, validações e chamadas da tela, preservando os contratos da API.
export function useCategoryScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  async function loadCategories() {
    try {
      setCategories(await CategoryService.getAll());
    } catch (requestError: unknown) {
      setError(errorMessage(requestError, "Não foi possível carregar as categorias."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadCategories(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const closeModals = () => {
    setIsAddOpen(false);
    setIsEditOpen(false);
    setEditingCategory(null);
    setFormError("");
  };

  const openAdd = () => {
    setForm(emptyForm);
    setFormError("");
    setIsAddOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({ name: category.name });
    setFormError("");
    setIsEditOpen(true);
  };

  const validate = () => form.name.trim().length < 2 ? "Informe um nome com pelo menos 2 caracteres." : "";

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) { setFormError(validationError); return; }
    try {
      setIsSaving(true);
      const created = await CategoryService.create({ name: form.name.trim() });
      setCategories((current) => [...current, created]);
      closeModals();
      toast.success("Categoria adicionada.");
    } catch (requestError: unknown) {
      setError(errorMessage(requestError, "Não foi possível adicionar a categoria."));
    } finally { setIsSaving(false); }
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingCategory) return;
    const validationError = validate();
    if (validationError) { setFormError(validationError); return; }
    try {
      setIsSaving(true);
      const updated = await CategoryService.update(editingCategory.categoryId, { name: form.name.trim() });
      setCategories((current) => current.map((item) => item.categoryId === updated.categoryId ? updated : item));
      closeModals();
      toast.success("Alterações salvas.");
    } catch (requestError: unknown) {
      setError(errorMessage(requestError, "Não foi possível editar a categoria."));
    } finally { setIsSaving(false); }
  };

  const filteredCategories = categories.filter((category) => category.name.toLowerCase().includes(search.toLowerCase().trim()));

  return { search, setSearch, form, setForm, editingCategory, isAddOpen, isEditOpen, isLoading, isSaving, error, setError, formError, closeModals, openAdd, handleEdit, handleCreate, handleUpdate, filteredCategories };
}
