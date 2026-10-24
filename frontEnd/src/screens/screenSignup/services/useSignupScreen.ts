import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signup } from "./signup";

export interface SignupForm {
  companyName: string;
  userName: string;
  email: string;
  cellNumber: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export type SignupErrors = Partial<Record<keyof SignupForm | "general", string>>;

const emptyForm: SignupForm = { companyName: "", userName: "", email: "", cellNumber: "", password: "", confirmPassword: "", acceptTerms: false };

function formatCellNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validate(form: SignupForm): SignupErrors {
  const errors: SignupErrors = {};
  const digits = form.cellNumber.replace(/\D/g, "");

  if (form.companyName.trim().length < 2) errors.companyName = "Informe o nome da empresa.";
  if (form.userName.trim().length < 2) errors.userName = "Informe seu nome.";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Informe um e-mail válido.";
  if (digits.length !== 10 && digits.length !== 11) errors.cellNumber = "Informe um celular com DDD.";
  if (form.password.length < 8) errors.password = "A senha deve ter ao menos 8 caracteres.";
  if (form.confirmPassword !== form.password) errors.confirmPassword = "As senhas não coincidem.";
  if (!form.acceptTerms) errors.acceptTerms = "Aceite os termos para continuar.";

  return errors;
}

// Centraliza estado, validação e envio do cadastro; a tela só apresenta.
export function useSignupScreen() {
  const [form, setForm] = useState<SignupForm>(emptyForm);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Corrigir um campo limpa o erro dele e o erro geral.
  const updateField = <K extends keyof SignupForm>(field: K, value: SignupForm[K]) => {
    setForm((current) => ({ ...current, [field]: field === "cellNumber" ? formatCellNumber(String(value)) : value }));
    setErrors((current) => ({ ...current, [field]: undefined, general: undefined }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      document.getElementById(`signup-${Object.keys(validationErrors)[0]}`)?.focus();
      return;
    }

    setLoading(true);
    try {
      const response = await signup({
        companyName: form.companyName.trim(),
        userName: form.userName.trim(),
        email: form.email.trim().toLowerCase(),
        userCellNumber: form.cellNumber.replace(/\D/g, ""),
        password: form.password,
      });
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      localStorage.setItem("company", JSON.stringify(response.company));
      navigate("/home");
    } catch (error: unknown) {
      setErrors({ general: error instanceof Error && error.message ? error.message : "Não foi possível criar a conta." });
    } finally {
      setLoading(false);
    }
  };

  return { form, errors, showPassword, setShowPassword, loading, updateField, handleSubmit };
}
