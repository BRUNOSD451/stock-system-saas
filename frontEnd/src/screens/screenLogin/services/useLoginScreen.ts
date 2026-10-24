import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/login";

const iconProps = { size: 18, strokeWidth: 1.8, "aria-hidden": true } as const;

const alertIconProps = { size: 16, strokeWidth: 2, "aria-hidden": true } as const;

interface LoginFormState {
  cellNumber: string;
  password: string;
  remember: boolean;
}

interface LoginErrors {
  cellNumber?: string;
  password?: string;
  general?: string;
}

const rememberedCellKey = "rememberedCellNumber";

function formatCellNumber(value: string) {
  const sanitized = value.replace(/\D/g, "").slice(0, 11);

  if (sanitized.length > 7) {
    return sanitized.replace(/^(\d{2})(\d{5})(\d{0,4})$/, "($1) $2-$3").replace(/-$/, "");
  }

  if (sanitized.length > 2) {
    return sanitized.replace(/^(\d{2})(\d)/, "($1) $2");
  }

  return sanitized;
}

// Centraliza estado, validações e chamadas da tela, preservando os contratos da API.
export function useLoginScreen() {
  const [form, setForm] = useState<LoginFormState>({ cellNumber: "", password: "", remember: false });
  const [errors, setErrors] = useState<LoginErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const cellRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const rememberedCellNumber = localStorage.getItem(rememberedCellKey);

    if (rememberedCellNumber) {
      setForm((current) => ({
        ...current,
        cellNumber: formatCellNumber(rememberedCellNumber),
        remember: true,
      }));
    }

    cellRef.current?.focus();
  }, []);

  const handleCellNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCellNumber(e.target.value);

    setForm((f) => ({ ...f, cellNumber: formatted }));
    if (errors.cellNumber) setErrors((err) => ({ ...err, cellNumber: undefined }));
    if (errors.general) setErrors((err) => ({ ...err, general: undefined }));
  };

  const handleSenhaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, password: e.target.value }));
    if (errors.password) setErrors((err) => ({ ...err, password: undefined }));
    if (errors.general) setErrors((err) => ({ ...err, general: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: LoginErrors = {};
    const rawCellNumber = form.cellNumber.replace(/\D/g, "");

    if (!rawCellNumber) {
      newErrors.cellNumber = "Numero de celular é obrigatório.";
    } else if (rawCellNumber.length < 10 || rawCellNumber.length > 11) {
      newErrors.cellNumber = "Numero de celular inválido.";
    }

    if (!form.password) {
      newErrors.password = "Senha é obrigatória.";
    } else if (form.password.length < 6) {
      newErrors.password = "A senha deve ter ao menos 6 caracteres.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const response = await login(form.cellNumber, form.password);

      if (form.remember) {
        localStorage.setItem(rememberedCellKey, form.cellNumber.replace(/\D/g, ""));
      } else {
        localStorage.removeItem(rememberedCellKey);
      }

      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));
      localStorage.setItem("company", JSON.stringify(response.company));
      // Senha provisória: a pessoa cria a própria antes de usar o sistema.
      if (response.user.mustChangePassword) {
        navigate("/trocar-senha", { state: { currentPassword: form.password } });
        return;
      }
      navigate("/home");
    } catch (error: unknown) {
      setErrors({ general: error instanceof Error && error.message ? error.message : "Erro ao autenticar usuário." });
    } finally {
      setLoading(false);
    }
  };

  const handleRememberChange = (remember: boolean) => {
    setForm(current => ({ ...current, remember }));
    // Desmarcar a opção remove apenas o celular salvo, nunca manipula a senha.
    if (!remember) localStorage.removeItem(rememberedCellKey);
  };

  return { iconProps, alertIconProps, form, errors, showPassword, setShowPassword, loading, cellRef, handleCellNumberChange, handleSenhaChange, handleSubmit, handleRememberChange };
}
