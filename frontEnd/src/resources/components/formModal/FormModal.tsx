import type { FormEvent, ReactNode } from "react";
import { X } from "lucide-react";
import "./formModal.css";

export interface FormModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  error?: string;
  isSubmitting?: boolean;
  submitText?: string;
  submittingText?: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
}

export default function FormModal({
  isOpen,
  title,
  description,
  error,
  isSubmitting = false,
  submitText = "Salvar",
  submittingText = "Salvando...",
  onClose,
  onSubmit,
  children,
}: FormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="form-modal-backdrop" onClick={onClose}>
      <form
        className="form-modal"
        onSubmit={onSubmit}
        onClick={(event) => event.stopPropagation()}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-modal-title"
      >
        {/* Cabeçalho e ações ficam fixos; somente os campos rolam em formulários longos. */}
        <header className="form-modal-header">
          <div>
            <h2 id="form-modal-title">{title}</h2>
            {description && <p className="form-modal-description">{description}</p>}
          </div>
          <button
            type="button"
            className="form-modal-close"
            onClick={onClose}
            aria-label="Fechar modal"
            disabled={isSubmitting}
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        <div className="form-modal-body">
          {error && <div className="form-modal-error" role="alert">{error}</div>}
          {children}
        </div>
        <div className="form-modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting && <span className="btn-spinner" aria-hidden="true" />}
            {isSubmitting ? submittingText : submitText}
          </button>
        </div>
      </form>
    </div>
  );
}
