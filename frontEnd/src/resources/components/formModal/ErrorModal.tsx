import { AlertTriangle, X } from "lucide-react";
import "./formModal.css";

interface ErrorModalProps {
  isOpen: boolean;
  message: string;
  title?: string;
  onClose: () => void;
}

export default function ErrorModal({
  isOpen,
  message,
  title = "Não foi possível concluir a operação",
  onClose,
}: ErrorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="error-modal-backdrop" onClick={onClose}>
      <div className="error-modal" role="alertdialog" aria-modal="true" aria-labelledby="error-modal-title" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="form-modal-close" onClick={onClose} aria-label="Fechar mensagem de erro">
          <X size={18} aria-hidden />
        </button>
        <div className="error-modal-icon" aria-hidden="true"><AlertTriangle size={22} /></div>
        <h2 id="error-modal-title">{title}</h2>
        <p>{message}</p>
        <button type="button" className="btn btn-primary" onClick={onClose}>Entendi</button>
      </div>
    </div>
  );
}
