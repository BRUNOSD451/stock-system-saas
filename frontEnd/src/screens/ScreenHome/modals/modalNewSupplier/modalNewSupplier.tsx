import { useState } from "react";
import "./modalNewSupplier.css";

interface ModalNewSupplierProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModalNewSupplier({
  isOpen,
  onClose,
}: ModalNewSupplierProps) {
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Novo Fornecedor</h2>

          <button
            className="close-btn"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Nome do fornecedor</label>

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />
          </div>

          <div className="form-group">
            <label>CNPJ</label>

            <input
              type="text"
              value={cnpj}
              onChange={(e) =>
                setCnpj(e.target.value)
              }
            />
          </div>

          <div className="supplier-row">
            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label>Telefone</label>

              <input
                type="text"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value)
                }
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="cancel-btn"
            onClick={onClose}
          >
            Cancelar
          </button>

          <button className="confirm-btn">
            Salvar Fornecedor
          </button>
        </div>
      </div>
    </div>
  );
}