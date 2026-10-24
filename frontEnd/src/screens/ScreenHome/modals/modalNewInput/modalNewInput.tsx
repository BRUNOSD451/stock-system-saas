import { useState } from "react";
import "./modalNewInputStyle.css";

interface ModalNewInputProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Item {
  product: string;
  quantity: string;
}

export default function ModalNewInput({
  isOpen,
  onClose,
}: ModalNewInputProps) {
  const [supplier, setSupplier] = useState("");
  const [product, setProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [items, setItems] = useState<Item[]>([]);

  if (!isOpen) return null;

  const addProduct = () => {
    if (!product || !quantity) return;

    setItems([
      ...items,
      {
        product,
        quantity,
      },
    ]);

    setProduct("");
    setQuantity("");
  };

  const removeProduct = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2>Nova Entrada de Estoque</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Fornecedor</label>

            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            >
              <option value="">Selecione um fornecedor</option>
              <option value="1">Fornecedor A</option>
              <option value="2">Fornecedor B</option>
              <option value="3">Fornecedor C</option>
            </select>
          </div>

          <div className="product-area">
            <div className="form-group">
              <label>Produto</label>

              <select
                value={product}
                onChange={(e) => setProduct(e.target.value)}
              >
                <option value="">Selecione um produto</option>
                <option value="Notebook Dell">Notebook Dell</option>
                <option value="Mouse Logitech">Mouse Logitech</option>
                <option value="Monitor LG">Monitor LG</option>
              </select>
            </div>

            <div className="form-group quantity-group">
              <label>Quantidade</label>

              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
          </div>

          <button className="add-btn" onClick={addProduct}>
            Adicionar Produto
          </button>

          <div className="items-list">
            <h3>Produtos Adicionados</h3>

            {items.map((item, index) => (
              <div className="item-card" key={index}>
                <span>
                  {item.product} - Qtd: {item.quantity}
                </span>

                <button
                  className="remove-btn"
                  onClick={() => removeProduct(index)}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancelar
          </button>

          <button className="confirm-btn">
            Confirmar Entrada
          </button>
        </div>
      </div>
    </div>
  );
}