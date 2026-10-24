import "../style/suppliers.css";
import { Pencil, Plus, Search } from "lucide-react";
import LateralBar from "../../../resources/components/lateralBar/lateralBar";
import AddModal from "../../../resources/components/formModal/AddModal";
import EditModal from "../../../resources/components/formModal/EditModal";
import ErrorModal from "../../../resources/components/formModal/ErrorModal";
import EmptyState from "../../../resources/components/emptyState/EmptyState";
import { useSupplierScreen } from "../services/useSupplierScreen";

export default function SupplierScreen() {
  // A apresentação consome os dados e ações do serviço da tela.
  const { search, setSearch, form, setForm, editingSupplier, isAddOpen, isEditOpen, isLoading, isSaving, error, setError, formError, openAddModal, handleEdit, closeFormModals, handleCreate, handleUpdate, filteredSuppliers } = useSupplierScreen();

  return (

    <div className="app-layout">
      <LateralBar />

      <main className="page">
        <div className="page-inner">
          <header className="page-header">
            <div className="page-heading">
              <h1 className="page-title">Fornecedores</h1>
              <p className="page-subtitle">Contatos de quem abastece o estoque.</p>
            </div>
            <div className="page-actions">
              <button type="button" className="btn btn-primary" onClick={openAddModal}>
                <Plus size={16} strokeWidth={2.4} aria-hidden /> Adicionar fornecedor
              </button>
            </div>
          </header>

          <div className="page-toolbar">
            <label className="search-field">
              <Search size={16} aria-hidden />
              <span className="sr-only">Pesquisar fornecedor</span>
              <input
                type="search"
                placeholder="Pesquisar fornecedor"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            {!isLoading && <span className="result-count" aria-live="polite">{filteredSuppliers.length} {filteredSuppliers.length === 1 ? "fornecedor" : "fornecedores"}</span>}
          </div>

          <div className="table-sheet">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">E-mail</th>
                  <th scope="col">Telefone</th>
                  <th scope="col" className="col-actions"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr className="table-state"><td colSpan={4}><EmptyState isLoading title="Carregando fornecedores…" /></td></tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr className="table-state"><td colSpan={4}>
                    {search.trim()
                      ? <EmptyState title={`Nenhum fornecedor encontrado para “${search.trim()}”`}><p>Confira a grafia ou pesquise por outro termo.</p></EmptyState>
                      : <EmptyState title="Nenhum fornecedor cadastrado"><p>Cadastre fornecedores para vinculá-los aos produtos.</p></EmptyState>}
                  </td></tr>
                ) : filteredSuppliers.map((supplier) => (
                  <tr key={supplier.supplierId}>
                    <td className="cell-primary">{supplier.name}</td>

                    <td data-label="E-mail" className="cell-muted">{supplier.email}</td>

                    <td data-label="Telefone" className="cell-muted cell-number">{supplier.phone || "Não informado"}</td>

                    <td className="col-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          handleEdit(supplier)
                        }
                        aria-label={`Editar ${supplier.name}`}
                      >
                        <Pencil size={14} aria-hidden /> Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <ErrorModal isOpen={!!error} message={error} onClose={() => setError("")} />
      {/* O formulário só fecha após confirmação do serviço; erros mantêm os dados preenchidos. */}
      <AddModal isOpen={isAddOpen} title="Adicionar fornecedor" description="Preencha os dados do novo fornecedor." error={formError} isSubmitting={isSaving} submitText="Adicionar fornecedor" onClose={closeFormModals} onSubmit={handleCreate}>
        <label>Nome<input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>E-mail<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Telefone<input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
      </AddModal>
      <EditModal isOpen={isEditOpen} title="Editar fornecedor" description={editingSupplier ? `Atualize os dados de ${editingSupplier.name}.` : undefined} error={formError} isSubmitting={isSaving} submitText="Salvar alterações" onClose={closeFormModals} onSubmit={handleUpdate}>
        <label>Nome<input autoFocus value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>E-mail<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Telefone<input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
      </EditModal>
    </div>

  );
}
