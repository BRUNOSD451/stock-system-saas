import { useState } from "react";
import { Check, Copy, MessageCircle, X } from "lucide-react";
import type { TemporaryAccessView } from "../services/useUserScreen";
import "../../../resources/components/formModal/formModal.css";

interface TemporaryAccessModalProps {
  access: TemporaryAccessView;
  formatCellNumber: (value: string) => string;
  roleLabel: (role: string) => string;
  onClose: () => void;
}

// A senha provisória aparece só aqui e uma única vez; por isso clicar fora não fecha o modal.
export default function TemporaryAccessModal({ access, formatCellNumber, roleLabel, onClose }: TemporaryAccessModalProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const { user, temporaryPassword, kind } = access;
  const firstName = user.userName.trim().split(/\s+/)[0];
  const cellNumber = formatCellNumber(user.userCellNumber);

  const message = [
    `Olá, ${firstName}! Seu acesso ao StockControl:`,
    `Endereço: ${window.location.origin}`,
    `Celular: ${cellNumber}`,
    `Senha provisória: ${temporaryPassword}`,
    "No primeiro acesso você vai criar a sua própria senha.",
  ].join("\n");
  const whatsappUrl = `https://wa.me/55${user.userCellNumber.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  };

  return (
    <div className="form-modal-backdrop">
      <div className="form-modal temporary-access" role="dialog" aria-modal="true" aria-labelledby="temporary-access-title">
        <header className="form-modal-header">
          <div>
            <h2 id="temporary-access-title">{kind === "created" ? "Acesso criado" : "Senha redefinida"}</h2>
            <p className="form-modal-description">
              {kind === "created"
                ? `Acesso de ${user.userName} criado com o cargo ${roleLabel(user.userPosition)}. Envie os dados abaixo.`
                : `A senha anterior de ${user.userName} deixou de funcionar. Envie a nova senha provisória.`}
            </p>
          </div>
          <button type="button" className="form-modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="form-modal-body">
          <dl className="temporary-access-data">
            <div><dt>Celular</dt><dd>{cellNumber}</dd></div>
            <div><dt>Senha provisória</dt><dd className="temporary-access-password">{temporaryPassword}</dd></div>
          </dl>
          <p className="temporary-access-note">
            Esta senha não será mostrada de novo. No primeiro acesso, {firstName} vai criar uma senha própria.
          </p>
          {copyState === "failed" && <p className="field-error" role="alert">Não foi possível copiar. Selecione os dados acima e copie manualmente.</p>}
        </div>

        <div className="form-modal-actions temporary-access-actions">
          <button type="button" className="btn btn-secondary" onClick={() => void copy()}>
            {copyState === "copied" ? <><Check size={16} aria-hidden /> Copiado</> : <><Copy size={16} aria-hidden /> Copiar dados</>}
          </button>
          <a className="btn btn-secondary" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={16} aria-hidden /> Enviar pelo WhatsApp
          </a>
          <button type="button" className="btn btn-primary" onClick={onClose}>Concluir</button>
        </div>
      </div>
    </div>
  );
}
