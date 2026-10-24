import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UserService } from "../../../services/userService";
import getUserData from "../../../services/getUserData";
import { getErrorMessage } from "../../../services/screenUtils";

const MIN_PASSWORD_LENGTH = 8;

interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type ChangePasswordErrors = Partial<Record<keyof ChangePasswordForm | "general", string>>;

// Vindo do login, a senha provisória chega pelo state da navegação e não é pedida de novo.
export function useChangePasswordScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const providedPassword = (location.state as { currentPassword?: string } | null)?.currentPassword ?? "";
  const user = getUserData();
  const isFirstAccess = Boolean(user?.mustChangePassword);

  const [form, setForm] = useState<ChangePasswordForm>({ currentPassword: providedPassword, newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState<ChangePasswordErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateField = (field: keyof ChangePasswordForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined, general: undefined }));
  };

  const validate = () => {
    const next: ChangePasswordErrors = {};
    if (!form.currentPassword) next.currentPassword = isFirstAccess ? "Informe a senha provisória." : "Informe a senha atual.";
    if (form.newPassword.length < MIN_PASSWORD_LENGTH) next.newPassword = `A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    else if (form.newPassword === form.currentPassword) next.newPassword = "Escolha uma senha diferente da atual.";
    if (form.confirmPassword !== form.newPassword) next.confirmPassword = "As senhas não coincidem.";
    return next;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      document.getElementById(`password-${Object.keys(validationErrors)[0]}`)?.focus();
      return;
    }

    setLoading(true);
    try {
      const response = await UserService.changeOwnPassword(form.currentPassword, form.newPassword);
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      navigate("/home", { replace: true });
    } catch (error: unknown) {
      setErrors({ general: getErrorMessage(error, "Não foi possível salvar a nova senha.") });
    } finally {
      setLoading(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("company");
    navigate("/", { replace: true });
  };

  return {
    user, isFirstAccess, askCurrentPassword: !providedPassword, form, errors, showPassword, setShowPassword,
    loading, updateField, handleSubmit, signOut, minLength: MIN_PASSWORD_LENGTH,
  };
}
