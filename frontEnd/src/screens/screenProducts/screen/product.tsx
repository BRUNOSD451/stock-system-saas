import "../style/product.css";
import LateralBar from "../../../resources/components/lateralBar/lateralBar";
import AddModal from "../../../resources/components/formModal/AddModal";
import EditModal from "../../../resources/components/formModal/EditModal";
import ErrorModal from "../../../resources/components/formModal/ErrorModal";
import ConfirmModal from "../../../resources/components/confirmModal/ConfirmModal";
import EmptyState from "../../../resources/components/emptyState/EmptyState";
import FilterSelect from "../../../resources/components/filterBar/FilterSelect";
import { AlertTriangle, Archive, ArchiveRestore, Download, Package, Pencil, Plus, Search, SlidersHorizontal, Upload, X } from "lucide-react";
import { isActiveProduct, PRODUCT_UNITS, unitLabel } from "../../../services/productService";
import { useProductScreen, type ActiveFilter, type ProductSort, type StockFilter } from "../services/product";

export function ProductScreen() {
  // A apresentação consome os dados e ações do serviço da tela.
  const {
    adjustingProduct, adjustForm, setAdjustForm, adjustError, openAdjust, closeAdjust, handleAdjust,
    deactivating, setDeactivating, toggleActive, confirmDeactivate, exportCsv,
    lowStockThreshold, formatPrice, formatPriceInput, categories, suppliers, search, setSearch, filters, setFilter, sort, setSort,
    hasActiveFilters, clearFilters, totalProducts, form, setForm, editingProduct, isAddOpen, isEditOpen, isLoading, isSaving,
    error, setError, formError, userData, closeModals, openAdd, handleEdit, handleCreate, handleUpdate, filteredProducts,
  } = useProductScreen();

  const canEdit = userData?.userPosition !== "funcionario";

  // isEdit: o saldo só é digitado no cadastro; depois, muda por movimentação ou ajuste de inventário.
  const formFields = (isEdit: boolean) => <>
    <label>Nome<input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
    <div className="form-row">
      <label>Código <span className="optional-label">(SKU ou código de barras)</span><input value={form.sku} maxLength={60} onChange={(event) => setForm({ ...form, sku: event.target.value })} /></label>
      <label>Unidade
        <select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}>
          {PRODUCT_UNITS.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
        </select>
      </label>
    </div>
    <label>Descrição <span className="optional-label">(opcional)</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
    <div className="form-row">
      <label>Preço (BRL)<input inputMode="decimal" placeholder="0,00" value={form.price} onChange={(event) => setForm({ ...form, price: formatPriceInput(event.target.value) })} /></label>
      {isEdit
        ? <label>Estoque atual<input value={`${form.stockQuantity} ${form.unit}`} readOnly aria-describedby="product-stock-hint" />
            <span id="product-stock-hint" className="field-hint">Para corrigir o saldo, use “Ajustar estoque”.</span>
          </label>
        : <label>Estoque inicial<input type="number" min="0" step="1" value={form.stockQuantity} onChange={(event) => setForm({ ...form, stockQuantity: event.target.value })} /></label>}
    </div>
    <div className="form-row">
      <label>Categoria<select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Selecione</option>{categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.name}</option>)}</select></label>
      <label>Fornecedor <span className="optional-label">(opcional)</span>
        <select value={form.supplierId} onChange={(event) => setForm({ ...form, supplierId: event.target.value })}>
          <option value="">Nenhum</option>{suppliers.map((supplier) => <option key={supplier.supplierId} value={supplier.supplierId}>{supplier.name}</option>)}</select>
      </label>
    </div>
    <label className="image-upload-field">
      <span>Imagem <small>(opcional, até 5 MB)</small></span>
      <span className="image-upload-button">
        <Upload size={17} aria-hidden="true" />
        <span>{form.image ? form.image.name : "Escolher imagem"}</span>
      </span>
      <input className="image-upload-input" type="file" accept="image/*" onChange={(event) => setForm({ ...form, image: event.target.files?.[0] || null })} />
    </label>
  </>;

  // Diferença mostrada enquanto a pessoa digita a contagem.
  const adjustDifference = adjustingProduct && adjustForm.counted.trim() !== "" && Number.isInteger(Number(adjustForm.counted))
    ? Number(adjustForm.counted) - Number(adjustingProduct.stockQuantity)
    : null;

  return (

    <div className="app-layout">
      <LateralBar />

      <main className="page">
        <div className="page-inner">
          <header className="page-header">
            <div className="page-heading">
              <h1 className="page-title">Produtos</h1>
              <p className="page-subtitle">Preço, fornecedor e quantidade disponível de cada item do catálogo.</p>
            </div>
            <div className="page-actions">
              <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={isLoading || filteredProducts.length === 0}>
                <Download size={16} aria-hidden /> Exportar CSV
              </button>
              {canEdit && <button type="button" className="btn btn-primary" onClick={openAdd}><Plus size={16} strokeWidth={2.4} aria-hidden /> Adicionar produto</button>}
            </div>
          </header>

          <div className="page-toolbar">
            <label className="search-field">
              <Search size={16} aria-hidden />
              <span className="sr-only">Pesquisar produto</span>
              <input type="search" placeholder="Nome, código ou descrição" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            <FilterSelect label="Categoria" value={filters.category} defaultValue="all" onChange={(value) => setFilter("category", value)}
              options={[{ value: "all", label: "Todas" }, ...categories.map((category) => ({ value: String(category.categoryId), label: category.name }))]} />
            <FilterSelect label="Fornecedor" value={filters.supplier} defaultValue="all" onChange={(value) => setFilter("supplier", value)}
              options={[{ value: "all", label: "Todos" }, { value: "none", label: "Sem fornecedor" }, ...suppliers.map((supplier) => ({ value: String(supplier.supplierId), label: supplier.name }))]} />
            <FilterSelect label="Estoque" value={filters.stock} defaultValue="all" onChange={(value) => setFilter("stock", value as StockFilter)}
              options={[{ value: "all", label: "Todos" }, { value: "restock", label: "Precisa de reposição" }, { value: "out", label: "Sem estoque" }, { value: "ok", label: "Em estoque" }]} />
            <FilterSelect label="Situação" value={filters.status} defaultValue="active" onChange={(value) => setFilter("status", value as ActiveFilter)}
              options={[{ value: "active", label: "Ativos" }, { value: "inactive", label: "Inativos" }, { value: "all", label: "Todos" }]} />
            <FilterSelect label="Ordenar" value={sort} onChange={(value) => setSort(value as ProductSort)}
              options={[
                { value: "name-asc", label: "Nome (A–Z)" }, { value: "name-desc", label: "Nome (Z–A)" },
                { value: "stock-asc", label: "Menor estoque" }, { value: "stock-desc", label: "Maior estoque" },
                { value: "price-asc", label: "Menor preço" }, { value: "price-desc", label: "Maior preço" },
              ]} />
            {hasActiveFilters && <button type="button" className="btn btn-ghost btn-sm filter-clear" onClick={clearFilters}><X size={14} aria-hidden /> Limpar filtros</button>}
            {!isLoading && <span className="result-count" aria-live="polite">
              {hasActiveFilters ? `${filteredProducts.length} de ${totalProducts}` : filteredProducts.length} {totalProducts === 1 ? "produto" : "produtos"}
            </span>}
          </div>

          {isLoading ? <EmptyState isLoading framed title="Carregando produtos…" />
            : filteredProducts.length === 0 ? (
              totalProducts > 0
                ? <EmptyState framed title="Nenhum produto corresponde à busca e aos filtros">
                    <p>Ajuste os filtros ou limpe todos para ver o catálogo inteiro.</p>
                    <button type="button" className="btn btn-secondary" onClick={clearFilters}>Limpar filtros</button>
                  </EmptyState>
                : <EmptyState framed title="Nenhum produto cadastrado">
                    <p>Adicione o primeiro produto para começar a controlar o estoque.</p>
                    {canEdit && <button type="button" className="btn btn-primary" onClick={openAdd}><Plus size={16} strokeWidth={2.4} aria-hidden /> Adicionar produto</button>}
                  </EmptyState>
            ) : (
              <div className="table-sheet">
                <table className="data-table products-table">
                  <caption className="sr-only">Produtos do catálogo, com preço e quantidade em estoque</caption>
                  <thead>
                    <tr>
                      <th scope="col">Produto</th>
                      <th scope="col">Categoria</th>
                      <th scope="col">Fornecedor</th>
                      <th scope="col" className="cell-number cell-amount">Preço</th>
                      <th scope="col" className="cell-number cell-amount">Estoque</th>
                      {canEdit && <th scope="col" className="col-actions"><span className="sr-only">Ações</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((produto) => {
                      // Limite configurado na tela Empresa; zerado tem situação própria.
                      const quantity = Number(produto.stockQuantity);
                      const status = quantity <= 0 ? "out" : quantity < lowStockThreshold ? "low" : "ok";
                      const active = isActiveProduct(produto);
                      return (
                        <tr key={produto.productId} className={[status !== "ok" ? `is-${status}` : "", active ? "" : "is-inactive"].join(" ").trim() || undefined}>
                          <td className="product-cell">
                            <span className="product-thumb">
                              {produto.imageUrl ? <img src={produto.imageUrl} alt="" loading="lazy" /> : <Package size={18} strokeWidth={1.5} aria-hidden />}
                            </span>
                            <span className="product-text">
                              <span className="product-name-row">
                                <span className="cell-primary product-name">{produto.name}</span>
                                {!active && <span className="tag tag-neutral">Inativo</span>}
                              </span>
                              {(produto.sku || produto.description) && (
                                <span className="product-description">
                                  {produto.sku && <span className="product-sku">Cód. {produto.sku}</span>}
                                  {produto.sku && produto.description && " · "}
                                  {produto.description}
                                </span>
                              )}
                            </span>
                          </td>
                          <td data-label="Categoria" className="cell-muted">{categories.find((category) => category.categoryId === produto.categoryId)?.name || "Não informada"}</td>
                          <td data-label="Fornecedor" className="cell-muted">{suppliers.find((supplier) => supplier.supplierId === produto.supplierId)?.name || "Não informado"}</td>
                          <td data-label="Preço" className="cell-number cell-amount">{formatPrice(Number(produto.price))}</td>
                          <td data-label="Estoque" className="cell-number cell-amount">
                            <span className="product-stock">
                              {active && status === "out" && <span className="tag tag-danger"><AlertTriangle size={12} strokeWidth={2.4} aria-hidden /> Sem estoque</span>}
                              {active && status === "low" && <span className="tag tag-warning"><AlertTriangle size={12} strokeWidth={2.4} aria-hidden /> Estoque baixo</span>}
                              <span className="product-qty">{quantity}<small> {unitLabel(produto)}</small></span>
                            </span>
                          </td>
                          {canEdit && <td className="col-actions">
                            <span className="row-actions">
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleEdit(produto)} aria-label={`Editar ${produto.name}`}>
                                <Pencil size={14} aria-hidden /> Editar
                              </button>
                              <button type="button" className="btn btn-ghost btn-sm" onClick={() => openAdjust(produto)} aria-label={`Ajustar estoque de ${produto.name}`}>
                                <SlidersHorizontal size={14} aria-hidden /> Ajustar
                              </button>
                              <button type="button" className="btn btn-ghost btn-sm row-action-icon" onClick={() => toggleActive(produto)}
                                aria-label={active ? `Inativar ${produto.name}` : `Reativar ${produto.name}`} title={active ? "Inativar" : "Reativar"}>
                                {active ? <Archive size={15} aria-hidden /> : <ArchiveRestore size={15} aria-hidden />}
                              </button>
                            </span>
                          </td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      </main>

      <ErrorModal isOpen={!!error} message={error} onClose={() => setError("")} />
      {/* O formulário só fecha após confirmação do serviço; erros mantêm os dados preenchidos. */}
      <AddModal isOpen={isAddOpen} title="Adicionar produto" description="Preencha os dados do novo produto." error={formError} isSubmitting={isSaving} submitText="Adicionar produto" onClose={closeModals} onSubmit={handleCreate}>{formFields(false)}</AddModal>
      <EditModal isOpen={isEditOpen} title="Editar produto" description={editingProduct ? `Atualize os dados de ${editingProduct.name}.` : undefined} error={formError} isSubmitting={isSaving} submitText="Salvar alterações" onClose={closeModals} onSubmit={handleUpdate}>{formFields(true)}</EditModal>

      {/* Ajuste de inventário: a diferença vira uma entrada ou saída registrada no histórico. */}
      <EditModal isOpen={!!adjustingProduct} title="Ajustar estoque"
        description={adjustingProduct ? `Informe quanto de ${adjustingProduct.name} existe de fato no estoque.` : undefined}
        error={adjustError} isSubmitting={isSaving} submitText="Registrar ajuste" onClose={closeAdjust} onSubmit={handleAdjust}>
        {adjustingProduct && <>
          <p className="adjust-current">Saldo no sistema: <strong>{Number(adjustingProduct.stockQuantity)} {unitLabel(adjustingProduct)}</strong></p>
          <label>Quantidade contada<input autoFocus type="number" min="0" step="1" inputMode="numeric" value={adjustForm.counted} onChange={(event) => setAdjustForm({ ...adjustForm, counted: event.target.value })} /></label>
          {adjustDifference !== null && adjustDifference !== 0 && (
            <p className={`adjust-difference ${adjustDifference > 0 ? "is-in" : "is-out"}`} aria-live="polite">
              {adjustDifference > 0 ? "+" : "−"}{Math.abs(adjustDifference)} {unitLabel(adjustingProduct)}, registrado como {adjustDifference > 0 ? "entrada" : "saída"} de ajuste
            </p>
          )}
          <label>Motivo<textarea maxLength={300} placeholder="Ex.: contagem mensal, avaria, vencimento" value={adjustForm.reason} onChange={(event) => setAdjustForm({ ...adjustForm, reason: event.target.value })} /></label>
        </>}
      </EditModal>

      <ConfirmModal isOpen={!!deactivating} title="Inativar produto?"
        message={deactivating ? `${deactivating.name} deixa de aparecer nas entradas, saídas e na lista de reposição. O histórico é mantido e você pode reativar quando quiser.` : undefined}
        confirmText="Inativar" onConfirm={confirmDeactivate} onClose={() => setDeactivating(null)} />
    </div>
  );
}
