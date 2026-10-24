import { getErrorMessage } from "../../../services/screenUtils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SupplierService } from "../services/suppliers";
import type { Supplier } from "../../../resources/types/types";

type SupplierForm = Omit<Supplier, "supplierId">;

const emptyForm: SupplierForm = { name: "", email: "", phone: "" };

// Centraliza estado, validações e chamadas da tela, preservando os contratos da API.
export function useSupplierScreen() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  async function getData() {
    try {
      const data = await SupplierService.getAll();
      setSuppliers(data);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Não foi possível carregar os fornecedores."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void getData(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const openAddModal = () => {
    setForm(emptyForm);
    setFormError("");
    setIsAddOpen(true);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setForm({ name: supplier.name, email: supplier.email, phone: supplier.phone });
    setFormError("");
    setIsEditOpen(true);
  };

  const closeFormModals = () => {
    setIsAddOpen(false);
    setIsEditOpen(false);
    setEditingSupplier(null);
    setFormError("");
  };

  const validateForm = () => {
    if (form.name.trim().length < 2) return "Informe um nome com pelo menos 2 caracteres.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Informe um e-mail válido.";
    if (form.phone.trim().length < 8) return "Informe um telefone válido.";
    return "";
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) { setFormError(validationError); return; }
    try {
      setIsSaving(true); setFormError("");
      const created = await SupplierService.create({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() });
      setSuppliers((current) => [...current, created]);
      closeFormModals();
      toast.success("Fornecedor adicionado.");
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Não foi possível adicionar o fornecedor."));
    } finally { setIsSaving(false); }
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingSupplier) return;
    const validationError = validateForm();
    if (validationError) { setFormError(validationError); return; }
    try {
      setIsSaving(true); setFormError("");
      const updated = await SupplierService.update({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() }, editingSupplier.supplierId);
      setSuppliers((current) => current.map((item) => item.supplierId === updated.supplierId ? updated : item));
      closeFormModals();
      toast.success("Alterações salvas.");
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Não foi possível editar o fornecedor."));
    } finally { setIsSaving(false); }
  };

  const filteredSuppliers = suppliers.filter((supplier) =>
    [supplier.name, supplier.email, supplier.phone].join(" ").toLowerCase().includes(search.toLowerCase().trim())
  );

  return { search, setSearch, form, setForm, editingSupplier, isAddOpen, isEditOpen, isLoading, isSaving, error, setError, formError, openAddModal, handleEdit, closeFormModals, handleCreate, handleUpdate, filteredSuppliers };
}
