import { Upload } from "lucide-react";
import AddModal from "../../../resources/components/formModal/AddModal";
import ErrorModal from "../../../resources/components/formModal/ErrorModal";
import { useQuickAction, type QuickActionModalProps } from "../services/useQuickAction";
import { PRODUCT_UNITS, unitLabel } from "../../../services/productService";
export type { QuickAction } from "../services/useQuickAction";

export default function QuickActionModal(props: QuickActionModalProps) {
  const { action } = props;
  // Os campos são visuais; validação e persistência ficam no serviço da ação.
  const { categories, suppliers, products, movementItems, setMovementItems, movement, setMovement, observation, setObservation, productForm, setProductForm, supplierForm, setSupplierForm, formError, requestError, setRequestError, isSaving, close, title, description, addMovementItem, handleSubmit, formatPriceInput } = useQuickAction(props);

  const movementFields = <>
    <div className="picking-row">
      <label>Produto<select value={movement.productId} onChange={(event) => setMovement({ ...movement, productId: event.target.value })}><option value="">Selecione um produto</option>{products.map((product) => <option key={product.productId} value={product.productId}>{product.name}{action === "output" ? ` (estoque: ${product.stockQuantity})` : ""}</option>)}</select></label>
      <label>Quantidade<input type="number" min="1" step="1" inputMode="numeric" value={movement.quantity} onChange={(event) => setMovement({ ...movement, quantity: event.target.value })} /></label>
      <button type="button" className="btn btn-secondary" onClick={addMovementItem}>Incluir</button>
    </div>
    {movementItems.length === 0 ? <p className="picking-empty">Nenhum produto incluído ainda.</p> : (
      <ul className={`picking-list ${action === "input" ? "is-in" : "is-out"}`} aria-label="Produtos incluídos">
        {movementItems.map((item) => <li className="picking-item" key={item.productId}>
          <span className="picking-item-name">{products.find((product) => product.productId === Number(item.productId))?.name}</span>
          <span className="picking-item-qty">{action === "input" ? "+" : "−"}{item.quantity}<small>{unitLabel(products.find((product) => product.productId === Number(item.productId)) ?? {})}</small></span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMovementItems((current) => current.filter((selected) => selected.productId !== item.productId))}>Remover</button>
        </li>)}
      </ul>
    )}
    <label>Observação <span className="optional-label">(opcional)</span><textarea value={observation} onChange={(event) => setObservation(event.target.value)} /></label>
  </>;

  const productFields = <>
    <label>Nome<input autoFocus value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} /></label>
    <div className="form-row">
      <label>Código <span className="optional-label">(opcional)</span><input value={productForm.sku} maxLength={60} onChange={(event) => setProductForm({ ...productForm, sku: event.target.value })} /></label>
      <label>Unidade<select value={productForm.unit} onChange={(event) => setProductForm({ ...productForm, unit: event.target.value })}>
        {PRODUCT_UNITS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
      </select></label>
    </div>
    <label>Descrição <span className="optional-label">(opcional)</span><textarea value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></label>
    <div className="form-row">
      <label>Preço (BRL)<input inputMode="decimal" placeholder="0,00" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: formatPriceInput(event.target.value) })} /></label>
      <label>Estoque inicial<input type="number" min="0" step="1" value={productForm.stockQuantity} onChange={(event) => setProductForm({ ...productForm, stockQuantity: event.target.value })} /></label>
    </div>
    <div className="form-row">
      <label>Categoria<select value={productForm.categoryId} onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })}><option value="">Selecione</option>{categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.name}</option>)}</select></label>
      <label>Fornecedor <span className="optional-label">(opcional)</span><select value={productForm.supplierId} onChange={(event) => setProductForm({ ...productForm, supplierId: event.target.value })}><option value="">Nenhum</option>{suppliers.map((supplier) => <option key={supplier.supplierId} value={supplier.supplierId}>{supplier.name}</option>)}</select></label>
    </div>
    <label className="image-upload-field"><span>Imagem <small>(opcional, até 5 MB)</small></span><span className="image-upload-button"><Upload size={17} aria-hidden="true" /><span>{productForm.image ? productForm.image.name : "Escolher imagem"}</span></span><input className="image-upload-input" type="file" accept="image/*" onChange={(event) => setProductForm({ ...productForm, image: event.target.files?.[0] || null })} /></label>
  </>;

  const supplierFields = <>
    <label>Nome<input autoFocus value={supplierForm.name} onChange={(event) => setSupplierForm({ ...supplierForm, name: event.target.value })} /></label>
    <label>E-mail<input type="email" value={supplierForm.email} onChange={(event) => setSupplierForm({ ...supplierForm, email: event.target.value })} /></label>
    <label>Telefone<input type="tel" value={supplierForm.phone} onChange={(event) => setSupplierForm({ ...supplierForm, phone: event.target.value })} /></label>
  </>;

  return <>
    <AddModal isOpen={action !== null} title={title} description={description} error={formError} isSubmitting={isSaving} submitText={action === "input" ? "Confirmar entrada" : action === "output" ? "Confirmar saída" : action === "product" ? "Adicionar produto" : "Adicionar fornecedor"} onClose={close} onSubmit={handleSubmit}>
      {(action === "input" || action === "output") && movementFields}
      {action === "supplier" && supplierFields}
      {action === "product" && productFields}
    </AddModal>
    <ErrorModal isOpen={!!requestError} message={requestError} onClose={() => setRequestError("")} />
  </>;
}
