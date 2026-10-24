import "../style/category.css";
import { Pencil, Plus, Search } from "lucide-react";
import LateralBar from "../../../resources/components/lateralBar/lateralBar";
import AddModal from "../../../resources/components/formModal/AddModal";
import EditModal from "../../../resources/components/formModal/EditModal";
import ErrorModal from "../../../resources/components/formModal/ErrorModal";
import EmptyState from "../../../resources/components/emptyState/EmptyState";
import { useCategoryScreen } from "../services/category";

export function CategoryScreen() {
  // A apresentação consome os dados e ações do serviço da tela.
  const { search, setSearch, form, setForm, editingCategory, isAddOpen, isEditOpen, isLoading, isSaving, error, setError, formError, closeModals, openAdd, handleEdit, handleCreate, handleUpdate, filteredCategories } = useCategoryScreen();

  return (
    <div className="app-layout">
      <LateralBar />
      <main className="page">
        <div className="page-inner category-page">
          <header className="page-header">
            <div className="page-heading">
              <h1 className="page-title">Categorias</h1>
              <p className="page-subtitle">Grupos usados para organizar e filtrar os produtos.</p>
            </div>
            <div className="page-actions">
              <button type="button" className="btn btn-primary" onClick={openAdd}>
                <Plus size={16} strokeWidth={2.4} aria-hidden /> Adicionar categoria
              </button>
            </div>
          </header>

          <div className="page-toolbar">
            <label className="search-field">
              <Search size={16} aria-hidden />
              <span className="sr-only">Pesquisar categoria</span>
              <input
                type="search"
                placeholder="Pesquisar categoria"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            {!isLoading && <span className="result-count" aria-live="polite">{filteredCategories.length} {filteredCategories.length === 1 ? "categoria" : "categorias"}</span>}
          </div>

          <div className="table-sheet">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col" className="col-actions"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  <tr className="table-state"><td colSpan={2}><EmptyState isLoading title="Carregando categorias…" /></td></tr>
                ) : filteredCategories.length === 0 ? (
                  <tr className="table-state"><td colSpan={2}>
                    {search.trim()
                      ? <EmptyState title={`Nenhuma categoria encontrada para “${search.trim()}”`}><p>Confira a grafia ou pesquise por outro termo.</p></EmptyState>
                      : <EmptyState title="Nenhuma categoria cadastrada"><p>Crie categorias para agrupar os produtos do catálogo.</p></EmptyState>}
                  </td></tr>
                ) : filteredCategories.map((categoria) => (
                  <tr key={categoria.categoryId}>
                    <td className="cell-primary">{categoria.name}</td>

                    <td className="col-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          handleEdit(categoria)
                        }
                        aria-label={`Editar ${categoria.name}`}
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
      <AddModal isOpen={isAddOpen} title="Adicionar categoria" description="Informe o nome da nova categoria." error={formError} isSubmitting={isSaving} submitText="Adicionar categoria" onClose={closeModals} onSubmit={handleCreate}>
        <label>Nome<input autoFocus value={form.name} onChange={(event) => setForm({ name: event.target.value })} /></label>
      </AddModal>
      <EditModal isOpen={isEditOpen} title="Editar categoria" description={editingCategory ? `Atualize os dados de ${editingCategory.name}.` : undefined} error={formError} isSubmitting={isSaving} submitText="Salvar alterações" onClose={closeModals} onSubmit={handleUpdate}>
        <label>Nome<input autoFocus value={form.name} onChange={(event) => setForm({ name: event.target.value })} /></label>
      </EditModal>
    </div>
  );
}
