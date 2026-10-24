import MovementProducts from "../../../resources/components/movementProducts/MovementProducts";
import "../style/input.css";
import { ArrowDown, Download, Plus, Undo2 } from "lucide-react";
import LateralBar from "../../../resources/components/lateralBar/lateralBar";
import AddModal from "../../../resources/components/formModal/AddModal";
import ErrorModal from "../../../resources/components/formModal/ErrorModal";
import ConfirmModal from "../../../resources/components/confirmModal/ConfirmModal";
import EmptyState from "../../../resources/components/emptyState/EmptyState";
import MovementToolbar from "../../../resources/components/filterBar/MovementToolbar";
import MovementKindTags, { canReverse } from "../../../resources/components/movementLedger/MovementKindTags";
import { unitLabel } from "../../../services/productService";
import { useInputScreen } from "../services/useInputScreen";

export default function InputScreen() {
  // A apresentação consome os dados e ações do serviço da tela.
  const { reverseTarget, setReverseTarget, confirmReverse, activeProducts, exportCsv, filters, totalInputs, itemsAvailable, emptyForm, dateLabel, products, form, setForm, selectedItems, setSelectedItems, isOpen, setIsOpen, isLoading, saving, error, setError, formError, setFormError, productName, groupedInputs, resetForm, addItem, handleCreate } = useInputScreen();

  const openForm = () => { setForm(emptyForm); setFormError(""); setIsOpen(true); };
  const unitOf = (productId: number) => unitLabel(products.find((product) => product.productId === productId) ?? {});

  return (
    <div className="app-layout"><LateralBar /><main className="page"><div className="page-inner">
      <header className="page-header">
        <div className="page-heading">
          <h1 className="page-title">Entradas de estoque</h1>
          <p className="page-subtitle">Recebimentos registrados no estoque, com os produtos de cada um.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={isLoading || !itemsAvailable || groupedInputs.length === 0}>
            <Download size={16} aria-hidden /> Exportar CSV
          </button>
          <button type="button" className="btn btn-primary" onClick={openForm}><Plus size={16} strokeWidth={2.4} aria-hidden /> Nova entrada</button>
        </div>
      </header>

      {/* Livro de registros: cada linha é uma entrada com seus produtos sob demanda. */}
      {!isLoading && totalInputs > 0 && (
        <MovementToolbar filters={filters} products={products} shown={groupedInputs.length} total={totalInputs}
          itemsAvailable={itemsAvailable} noun={{ singular: "entrada", plural: "entradas" }} />
      )}

      {isLoading ? <EmptyState isLoading framed title="Carregando entradas…" />
        : groupedInputs.length === 0 && filters.hasActiveFilters ? <EmptyState framed title="Nenhuma entrada corresponde aos filtros">
            <p>Ajuste o período, o produto ou a busca.</p>
            <button type="button" className="btn btn-secondary" onClick={filters.clearFilters}>Limpar filtros</button>
          </EmptyState>
        : groupedInputs.length === 0 ? <EmptyState framed title="Nenhuma entrada registrada">
            <p>Registre os produtos recebidos para atualizar o estoque.</p>
            <button type="button" className="btn btn-primary" onClick={openForm}><Plus size={16} strokeWidth={2.4} aria-hidden /> Nova entrada</button>
          </EmptyState>
        : <ol className="ledger is-in" aria-label="Entradas registradas">{groupedInputs.map(({ input }) => <li key={input.stockInputId} className="ledger-row">
          <span className="ledger-mark" aria-hidden="true"><ArrowDown size={18} strokeWidth={2} /></span>
          <div className="ledger-body">
            <div className="ledger-head">
              <span className="ledger-title-row">
                <h2 className="ledger-title">Entrada #{input.stockInputId}</h2>
                <MovementKindTags type="input" kind={input.kind} reversesId={input.reversesOutputId} reversedById={input.reversedById} />
              </span>
              <span className="ledger-meta">
                <time className="ledger-date" dateTime={input.createdAt}>{dateLabel(input.createdAt)}</time>
                {canReverse(input.kind, input.reversedById) && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReverseTarget(input)} aria-label={`Estornar entrada ${input.stockInputId}`}>
                    <Undo2 size={14} aria-hidden /> Estornar
                  </button>
                )}
              </span>
            </div>
            <p className={`ledger-note${input.observation ? "" : " is-empty"}`}>{input.observation || "Sem observação"}</p>
            <MovementProducts id={input.stockInputId} type="input" />
          </div>
        </li>)}</ol>}

      <ErrorModal isOpen={!!error} message={error} onClose={() => setError("")} />
      {/* O formulário só fecha após confirmação do serviço; erros mantêm os dados preenchidos. */}
      <AddModal isOpen={isOpen} title="Nova entrada de estoque" description="Inclua os produtos e as quantidades recebidas." error={formError} isSubmitting={saving} submitText="Confirmar entrada" onClose={resetForm} onSubmit={handleCreate}>
        <div className="picking-row">
          <label>Produto<select value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}><option value="">Selecione um produto</option>{activeProducts.map((product) => <option key={product.productId} value={product.productId}>{product.name}</option>)}</select></label>
          <label>Quantidade<input type="number" min="1" step="1" inputMode="numeric" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label>
          <button type="button" className="btn btn-secondary" onClick={addItem}>Incluir</button>
        </div>
        {selectedItems.length === 0 ? <p className="picking-empty">Nenhum produto incluído ainda.</p> : (
          <ul className="picking-list is-in" aria-label="Produtos incluídos">
            {selectedItems.map((item) => <li className="picking-item" key={item.productId}>
              <span className="picking-item-name">{productName(item.productId)}</span>
              <span className="picking-item-qty">+{item.quantity}<small>{unitOf(item.productId)}</small></span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedItems((current) => current.filter((selected) => selected.productId !== item.productId))}>Remover</button>
            </li>)}
          </ul>
        )}
        <label>Observação <span className="optional-label">(opcional)</span><textarea value={form.observation} onChange={(event) => setForm({ ...form, observation: event.target.value })} /></label>
      </AddModal>

      <ConfirmModal isOpen={!!reverseTarget} title={reverseTarget ? `Estornar entrada #${reverseTarget.stockInputId}?` : undefined}
        message="Uma saída com os mesmos produtos e quantidades será registrada, e os saldos voltam ao que eram antes desta entrada. A entrada continua no histórico, marcada como estornada."
        confirmText="Estornar" onConfirm={confirmReverse} onClose={() => setReverseTarget(null)} />
    </div></main></div>
  );
}
