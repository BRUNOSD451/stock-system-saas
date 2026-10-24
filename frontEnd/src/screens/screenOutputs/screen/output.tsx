import MovementProducts from "../../../resources/components/movementProducts/MovementProducts";
import "../style/output.css";
import { ArrowUp, Download, Plus, Undo2 } from "lucide-react";
import LateralBar from "../../../resources/components/lateralBar/lateralBar";
import AddModal from "../../../resources/components/formModal/AddModal";
import ErrorModal from "../../../resources/components/formModal/ErrorModal";
import ConfirmModal from "../../../resources/components/confirmModal/ConfirmModal";
import EmptyState from "../../../resources/components/emptyState/EmptyState";
import MovementToolbar from "../../../resources/components/filterBar/MovementToolbar";
import MovementKindTags, { canReverse } from "../../../resources/components/movementLedger/MovementKindTags";
import { unitLabel } from "../../../services/productService";
import { useOutputScreen } from "../services/useOutputScreen";

export default function OutputScreen() {
  // A apresentação consome os dados e ações do serviço da tela.
  const { reverseTarget, setReverseTarget, confirmReverse, activeProducts, exportCsv, filters, totalOutputs, itemsAvailable, emptyForm, dateLabel, products, form, setForm, selectedItems, setSelectedItems, isOpen, setIsOpen, isLoading, saving, error, setError, formError, setFormError, productName, groupedOutputs, resetForm, addItem, handleCreate } = useOutputScreen();

  const openForm = () => { setForm(emptyForm); setFormError(""); setIsOpen(true); };
  const unitOf = (productId: number) => unitLabel(products.find((product) => product.productId === productId) ?? {});

  return <div className="app-layout"><LateralBar /><main className="page"><div className="page-inner">
    <header className="page-header">
      <div className="page-heading">
        <h1 className="page-title">Saídas de estoque</h1>
        <p className="page-subtitle">Retiradas registradas no estoque, com os produtos de cada uma.</p>
      </div>
      <div className="page-actions">
        <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={isLoading || !itemsAvailable || groupedOutputs.length === 0}>
          <Download size={16} aria-hidden /> Exportar CSV
        </button>
        <button type="button" className="btn btn-primary" onClick={openForm}><Plus size={16} strokeWidth={2.4} aria-hidden /> Nova saída</button>
      </div>
    </header>

    {/* Livro de registros: cada linha é uma saída com seus produtos sob demanda. */}
    {!isLoading && totalOutputs > 0 && (
      <MovementToolbar filters={filters} products={products} shown={groupedOutputs.length} total={totalOutputs}
        itemsAvailable={itemsAvailable} noun={{ singular: "saída", plural: "saídas" }} />
    )}

    {isLoading ? <EmptyState isLoading framed title="Carregando saídas…" />
      : groupedOutputs.length === 0 && filters.hasActiveFilters ? <EmptyState framed title="Nenhuma saída corresponde aos filtros">
          <p>Ajuste o período, o produto ou a busca.</p>
          <button type="button" className="btn btn-secondary" onClick={filters.clearFilters}>Limpar filtros</button>
        </EmptyState>
      : groupedOutputs.length === 0 ? <EmptyState framed title="Nenhuma saída registrada">
          <p>Registre os produtos retirados para manter o estoque correto.</p>
          <button type="button" className="btn btn-primary" onClick={openForm}><Plus size={16} strokeWidth={2.4} aria-hidden /> Nova saída</button>
        </EmptyState>
      : <ol className="ledger is-out" aria-label="Saídas registradas">{groupedOutputs.map(({ output }) => <li key={output.stockOutputId} className="ledger-row">
        <span className="ledger-mark" aria-hidden="true"><ArrowUp size={18} strokeWidth={2} /></span>
        <div className="ledger-body">
          <div className="ledger-head">
            <span className="ledger-title-row">
              <h2 className="ledger-title">Saída #{output.stockOutputId}</h2>
              <MovementKindTags type="output" kind={output.kind} reversesId={output.reversesInputId} reversedById={output.reversedById} />
            </span>
            <span className="ledger-meta">
              <time className="ledger-date" dateTime={output.createdAt}>{dateLabel(output.createdAt)}</time>
              {canReverse(output.kind, output.reversedById) && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReverseTarget(output)} aria-label={`Estornar saída ${output.stockOutputId}`}>
                  <Undo2 size={14} aria-hidden /> Estornar
                </button>
              )}
            </span>
          </div>
          <p className={`ledger-note${output.observation ? "" : " is-empty"}`}>{output.observation || "Sem observação"}</p>
          <MovementProducts id={output.stockOutputId} type="output" />
        </div>
      </li>)}</ol>}

    <ErrorModal isOpen={!!error} message={error} onClose={() => setError("")} />
    {/* O formulário só fecha após confirmação do serviço; erros mantêm os dados preenchidos. */}
    <AddModal isOpen={isOpen} title="Nova saída de estoque" description="Inclua os produtos e as quantidades retiradas." error={formError} isSubmitting={saving} submitText="Confirmar saída" onClose={resetForm} onSubmit={handleCreate}>
      <div className="picking-row">
        <label>Produto<select value={form.productId} onChange={(event) => setForm({ ...form, productId: event.target.value })}>
          <option value="">Selecione um produto</option>{activeProducts.map((product) => <option key={product.productId} value={product.productId}>{product.name} (estoque: {product.stockQuantity} {unitLabel(product)})</option>)}</select>
        </label>
        <label>Quantidade<input type="number" min="1" step="1" inputMode="numeric" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
        </label>
        <button type="button" className="btn btn-secondary" onClick={addItem}>Incluir</button>
      </div>
      {selectedItems.length === 0 ? <p className="picking-empty">Nenhum produto incluído ainda.</p> : (
        <ul className="picking-list is-out" aria-label="Produtos incluídos">
          {selectedItems.map((item) => <li className="picking-item" key={item.productId}>
            <span className="picking-item-name">{productName(item.productId)}</span>
            <span className="picking-item-qty">−{item.quantity}<small>{unitOf(item.productId)}</small></span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedItems((current) => current.filter((selected) => selected.productId !== item.productId))}>Remover</button>
          </li>)}
        </ul>
      )}
      <label>Observação <span className="optional-label">(opcional)</span><textarea value={form.observation} onChange={(event) => setForm({ ...form, observation: event.target.value })} />
      </label>
    </AddModal>

    <ConfirmModal isOpen={!!reverseTarget} title={reverseTarget ? `Estornar saída #${reverseTarget.stockOutputId}?` : undefined}
      message="Uma entrada com os mesmos produtos e quantidades será registrada, devolvendo os itens ao estoque. A saída continua no histórico, marcada como estornada."
      confirmText="Estornar" onConfirm={confirmReverse} onClose={() => setReverseTarget(null)} />
  </div></main></div>;
}
