import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import "./confirmModal.css";

export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export default function ConfirmModal({
  isOpen,
  title = "Confirmar ação",
  message = "Tem certeza que deseja continuar?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setIsConfirming(true);
      await onConfirm();
      onClose();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="confirm-modal-backdrop" onClick={onClose}>
      <div
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="confirm-modal-close"
          onClick={onClose}
          aria-label="Fechar confirmação"
          disabled={isConfirming}
        >
          <X size={18} aria-hidden />
        </button>

        <div className="confirm-modal-icon" aria-hidden="true">
          <AlertTriangle size={24} strokeWidth={2} />
        </div>
        <h2 id="confirm-modal-title">{title}</h2>
        <p>{message}</p>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isConfirming}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => void handleConfirm()}
            disabled={isConfirming}
          >
            {isConfirming ? "Aguarde..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
