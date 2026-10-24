import { getErrorMessage } from "../../../services/screenUtils";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { User } from "../../../resources/types/types";
import {
  createUser,
  getUsers,
  resetUserPassword,
  updateUser,
  type CreateUserData,
  type UpdateUserData,
} from "../services/users";

type UserForm = {
  userName: string;
  userCellNumber: string;
  userPosition: User["userPosition"];
};

// A senha não é mais definida pelo administrador: o sistema gera uma provisória.
type CreateUserForm = UserForm;

type EditUserForm = UserForm;

// Credenciais exibidas uma única vez após criar o usuário ou redefinir a senha.
export interface TemporaryAccessView {
  kind: "created" | "reset";
  user: User;
  temporaryPassword: string;
}

const emptyUserForm: UserForm = {
  userName: "",
  userCellNumber: "",
  userPosition: "funcionario",
};

const emptyCreateForm: CreateUserForm = { ...emptyUserForm };

const emptyEditForm: EditUserForm = { ...emptyUserForm };

function formatCellNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validateCellNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  const areaCode = Number(digits.slice(0, 2));

  if (digits.length !== 10 && digits.length !== 11) {
    return "Informe um celular com DDD e 8 ou 9 dígitos.";
  }
  if (areaCode < 11 || areaCode > 99) {
    return "Informe um DDD válido.";
  }
  if (digits.length === 11 && digits[2] !== "9") {
    return "Celulares com 11 dígitos devem começar com 9 após o DDD.";
  }
  if (/^(\d)\1+$/.test(digits)) {
    return "Informe um número de celular válido.";
  }

  return "";
}

function roleLabel(role: string) {
  if (role === "administrador") return "Administrador";
  if (role === "supervisor") return "Supervisor";
  return "Funcionário";
}

// Centraliza estado, validações e chamadas da tela, preservando os contratos da API.
export function useUserScreen() {
  const [createImage, setCreateImage] = useState<File | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [createForm, setCreateForm] = useState<CreateUserForm>(emptyCreateForm);
  const [editForm, setEditForm] = useState<EditUserForm>(emptyEditForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [temporaryAccess, setTemporaryAccess] = useState<TemporaryAccessView | null>(null);
  const [resetTarget, setResetTarget] = useState<User | null>(null);

  const loadUsers = async () => {
    try {
      setError("");
      setIsLoading(true);
      setUsers(await getUsers());
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Não foi possível carregar os usuários."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void loadUsers(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  // Cargo e situação ("pending" = ainda não fez o primeiro acesso com a senha provisória).
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<"name-asc" | "name-desc">("name-asc");

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.toLowerCase().trim();
    return users
      .filter((user) => !normalizedSearch || [user.userName, user.userCellNumber, user.userPosition].join(" ").toLowerCase().includes(normalizedSearch))
      .filter((user) => roleFilter === "all" || user.userPosition === roleFilter)
      .filter((user) => statusFilter === "all" || (statusFilter === "pending") === Boolean(user.mustChangePassword))
      .sort((a, b) => {
        const diff = a.userName.localeCompare(b.userName, "pt-BR", { sensitivity: "base" });
        return sort === "name-asc" ? diff : -diff;
      });
  }, [search, users, roleFilter, statusFilter, sort]);

  const hasActiveFilters = !!search.trim() || roleFilter !== "all" || statusFilter !== "all";
  const clearFilters = () => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); };

  const openCreateModal = () => {
    setCreateImage(null);
    setCreateForm(emptyCreateForm);
    setFormError("");
    setIsCreateModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      userName: user.userName,
      userCellNumber: formatCellNumber(user.userCellNumber),
      userPosition: user.userPosition,
    });
    setFormError("");
    setIsEditModalOpen(true);
  };

  const closeFormModals = () => {
    setIsCreateModalOpen(false);
    setIsEditModalOpen(false);
    setEditingUser(null);
    setFormError("");
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cellNumber = createForm.userCellNumber.replace(/\D/g, "");
    const phoneError = validateCellNumber(cellNumber);

    if (createForm.userName.trim().length < 2) {
      setFormError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    if (phoneError) {
      setFormError(phoneError);
      return;
    }

    try {
      setFormError("");
      setIsSaving(true);
      const data: CreateUserData = {
        userName: createForm.userName.trim(),
        userCellNumber: cellNumber,
        userPosition: createForm.userPosition,
      };
      const created = await createUser(data, createImage);
      setUsers((currentUsers) => [...currentUsers, created.user]);
      closeFormModals();
      setTemporaryAccess({ kind: "created", ...created });
    } catch (requestError: unknown) {
      setFormError(getErrorMessage(requestError, "Não foi possível adicionar o usuário."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser) return;

    const cellNumber = editForm.userCellNumber.replace(/\D/g, "");
    const phoneError = validateCellNumber(cellNumber);

    if (editForm.userName.trim().length < 2) {
      setFormError("Informe um nome com pelo menos 2 caracteres.");
      return;
    }
    if (phoneError) {
      setFormError(phoneError);
      return;
    }

    try {
      setFormError("");
      setIsSaving(true);
      const data: UpdateUserData = {
        userName: editForm.userName.trim(),
        userCellNumber: cellNumber,
        userPosition: editForm.userPosition,
      };
      const updatedUser = await updateUser(editingUser.userId, data);
      setUsers((currentUsers) => currentUsers.map((user) =>
        user.userId === updatedUser.userId ? updatedUser : user
      ));
      closeFormModals();
      toast.success("Alterações salvas.");
    } catch (requestError: unknown) {
      setFormError(getErrorMessage(requestError, "Não foi possível atualizar o usuário."));
    } finally {
      setIsSaving(false);
    }
  };

  // Confirmada no modal, gera nova senha provisória; a anterior deixa de funcionar.
  const confirmResetPassword = async () => {
    if (!resetTarget) return;
    try {
      const reset = await resetUserPassword(resetTarget.userId);
      setUsers((currentUsers) => currentUsers.map((user) => user.userId === reset.user.userId ? reset.user : user));
      setTemporaryAccess({ kind: "reset", ...reset });
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, "Não foi possível redefinir a senha."));
    }
  };

  return { roleFilter, setRoleFilter, statusFilter, setStatusFilter, sort, setSort, hasActiveFilters, clearFilters, totalUsers: users.length, temporaryAccess, closeTemporaryAccess: () => setTemporaryAccess(null), resetTarget, setResetTarget, confirmResetPassword, createImage, setCreateImage, formatCellNumber, roleLabel, search, setSearch, createForm, setCreateForm, editForm, setEditForm, editingUser, isCreateModalOpen, isEditModalOpen, isLoading, isSaving, error, setError, formError, filteredUsers, openCreateModal, handleEdit, closeFormModals, handleCreate, handleUpdate };
}
