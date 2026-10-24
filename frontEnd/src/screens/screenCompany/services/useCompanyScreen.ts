import { useEffect, useMemo, useState } from "react";
import type { Company } from "../../../resources/types/types";
import { CompanyService } from "../../../services/companyService";
import { saveCompanyData } from "../../../services/getUserData";
import { getErrorMessage } from "../../../services/screenUtils";

export interface CompanyForm {
  name: string;
  email: string;
  lowStockThreshold: string;
}

export type CompanyFormErrors = Partial<Record<keyof CompanyForm | "logo", string>>;

const MAX_LOGO_SIZE = 5 * 1024 * 1024;

const planLabels: Record<string, string> = { free: "Grátis", pro: "Pro" };
const statusLabels: Record<string, string> = {
  trial: "Em teste",
  active: "Ativa",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
  suspended: "Suspensa",
};

const toForm = (company: Company): CompanyForm => ({
  name: company.name,
  email: company.email ?? "",
  lowStockThreshold: String(company.lowStockThreshold ?? 10),
});

function validate(form: CompanyForm): CompanyFormErrors {
  const errors: CompanyFormErrors = {};
  const threshold = Number(form.lowStockThreshold);
  if (form.name.trim().length < 2) errors.name = "Informe o nome da empresa.";
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = "Informe um e-mail válido.";
  if (form.lowStockThreshold.trim() === "" || !Number.isInteger(threshold) || threshold < 0 || threshold > 1000000) {
    errors.lowStockThreshold = "Informe um número inteiro de 0 a 1.000.000.";
  }
  return errors;
}

// Centraliza carregamento, validação e envio dos dados da empresa; a tela só apresenta.
export function useCompanyScreen() {
  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyForm>({ name: "", email: "", lowStockThreshold: "10" });
  const [logo, setLogo] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [errors, setErrors] = useState<CompanyFormErrors>({});
  const [requestError, setRequestError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    CompanyService.getMine()
      .then((loaded) => {
        if (!active) return;
        setCompany(loaded);
        // Mantém a situação da assinatura salva no login em dia (ex.: o aviso da barra lateral).
        saveCompanyData(loaded);
        setForm(toForm(loaded));
        setLoadError("");
      })
      .catch((error: unknown) => { if (active) setLoadError(getErrorMessage(error, "Não foi possível carregar os dados da empresa.")); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  // A prévia é derivada do arquivo escolhido; o URL temporário é liberado ao trocar ou sair.
  const logoPreview = useMemo(() => (logo ? URL.createObjectURL(logo) : ""), [logo]);
  useEffect(() => () => { if (logoPreview) URL.revokeObjectURL(logoPreview); }, [logoPreview]);
  const currentLogo = logoPreview || (removeLogo ? "" : company?.logoUrl ?? "");

  const isDirty = !!company && (
    form.name !== company.name ||
    form.email !== (company.email ?? "") ||
    form.lowStockThreshold !== String(company.lowStockThreshold ?? 10) ||
    !!logo || removeLogo
  );

  const updateField = (field: keyof CompanyForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setJustSaved(false);
  };

  const chooseLogo = (file: File | null) => {
    setJustSaved(false);
    if (file && (!file.type.startsWith("image/") || file.size > MAX_LOGO_SIZE)) {
      setErrors((current) => ({ ...current, logo: "Escolha uma imagem de até 5 MB." }));
      return;
    }
    setErrors((current) => ({ ...current, logo: undefined }));
    setLogo(file);
    if (file) setRemoveLogo(false);
  };

  const clearLogo = () => {
    setLogo(null);
    setRemoveLogo(!!company?.logoUrl);
    setJustSaved(false);
  };

  const discardChanges = () => {
    if (!company) return;
    setForm(toForm(company));
    setLogo(null);
    setRemoveLogo(false);
    setErrors({});
    setRequestError("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      document.getElementById(`company-${Object.keys(validationErrors)[0]}`)?.focus();
      return;
    }

    setIsSaving(true);
    setRequestError("");
    try {
      const updated = await CompanyService.updateMine({
        name: form.name.trim(),
        email: form.email.trim(),
        lowStockThreshold: Number(form.lowStockThreshold),
      }, logo, removeLogo);
      setCompany(updated);
      setForm(toForm(updated));
      setLogo(null);
      setRemoveLogo(false);
      saveCompanyData(updated);
      setJustSaved(true);
    } catch (error: unknown) {
      setRequestError(getErrorMessage(error, "Não foi possível salvar os dados da empresa."));
    } finally {
      setIsSaving(false);
    }
  };

  const retry = () => { setIsLoading(true); setLoadError(""); setAttempt((value) => value + 1); };

  const planLabel = company ? planLabels[company.plan] ?? company.plan : "";
  const statusLabel = company?.trialExpired ? "Teste encerrado"
    : company?.periodEnded ? "Vencida"
      : company ? statusLabels[company.status] ?? company.status : "";
  const trialDaysLeft = company?.status === "trial" && !company.trialExpired && company.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(company.trialEndsAt).getTime() - Date.now()) / 86400000))
    : null;

  return {
    company, form, errors, requestError, loadError, isLoading, isSaving, isDirty, justSaved,
    currentLogo, hasLogo: !!currentLogo, planLabel, statusLabel, trialDaysLeft,
    updateField, chooseLogo, clearLogo, discardChanges, handleSubmit, retry,
  };
}
