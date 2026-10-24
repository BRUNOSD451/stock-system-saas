import "../style/users.css";
import { KeyRound, Pencil, Plus, Search, X } from "lucide-react";
import FilterSelect from "../../../resources/components/filterBar/FilterSelect";
import ProfileImagePicker from "../../../resources/components/profileImage/ProfileImagePicker";
import LateralBar from "../../../resources/components/lateralBar/lateralBar";
import AddModal from "../../../resources/components/formModal/AddModal";
import EditModal from "../../../resources/components/formModal/EditModal";
import ErrorModal from "../../../resources/components/formModal/ErrorModal";
import EmptyState from "../../../resources/components/emptyState/EmptyState";
import ConfirmModal from "../../../resources/components/confirmModal/ConfirmModal";
import getUserData from "../../../services/getUserData";
import TemporaryAccessModal from "../components/TemporaryAccessModal";
import { useUserScreen } from "../services/useUserScreen";

export default function UserScreen() {
  // A apresentação consome os dados e ações do serviço da tela.
  const { roleFilter, setRoleFilter, statusFilter, setStatusFilter, sort, setSort, hasActiveFilters, clearFilters, totalUsers, temporaryAccess, closeTemporaryAccess, resetTarget, setResetTarget, confirmResetPassword, createImage, setCreateImage, formatCellNumber, roleLabel, search, setSearch, createForm, setCreateForm, editForm, setEditForm, editingUser, isCreateModalOpen, isEditModalOpen, isLoading, isSaving, error, setError, formError, filteredUsers, openCreateModal, handleEdit, closeFormModals, handleCreate, handleUpdate } = useUserScreen();
  const currentUserId = getUserData()?.userId;

  return (
    <div className="app-layout">
      <LateralBar />
      <main className="page">
        <div className="page-inner">
          <header className="page-header">
            <div className="page-heading">
              <h1 className="page-title">Usuários</h1>
              <p className="page-subtitle">Quem acessa o sistema e o que cada cargo pode fazer.</p>
            </div>
            <div className="page-actions">
              <button type="button" className="btn btn-primary" onClick={openCreateModal}>
                <Plus size={16} strokeWidth={2.4} aria-hidden /> Adicionar usuário
              </button>
            </div>
          </header>

          <div className="page-toolbar">
            <label className="search-field">
              <Search size={16} aria-hidden />
              <span className="sr-only">Pesquisar usuário</span>
              <input
                type="search"
                placeholder="Pesquisar por nome, celular ou cargo"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <FilterSelect label="Cargo" value={roleFilter} defaultValue="all" onChange={setRoleFilter}
              options={[{ value: "all", label: "Todos" }, { value: "administrador", label: "Administrador" }, { value: "supervisor", label: "Supervisor" }, { value: "funcionario", label: "Funcionário" }]} />
            <FilterSelect label="Situação" value={statusFilter} defaultValue="all" onChange={setStatusFilter}
              options={[{ value: "all", label: "Todas" }, { value: "active", label: "Acesso ativo" }, { value: "pending", label: "Aguardando primeiro acesso" }]} />
            <FilterSelect label="Ordenar" value={sort} onChange={(value) => setSort(value as "name-asc" | "name-desc")}
              options={[{ value: "name-asc", label: "Nome (A–Z)" }, { value: "name-desc", label: "Nome (Z–A)" }]} />
            {hasActiveFilters && <button type="button" className="btn btn-ghost btn-sm filter-clear" onClick={clearFilters}><X size={14} aria-hidden /> Limpar filtros</button>}
            {!isLoading && <span className="result-count" aria-live="polite">
              {hasActiveFilters ? `${filteredUsers.length} de ${totalUsers}` : filteredUsers.length} {totalUsers === 1 ? "usuário" : "usuários"}
            </span>}
          </div>

          <div className="table-sheet">
            <table className="data-table">
              <thead>
                <tr><th scope="col">Nome</th><th scope="col">Celular</th><th scope="col">Cargo</th><th scope="col" className="col-actions"><span className="sr-only">Ações</span></th></tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="table-state"><td colSpan={4}><EmptyState isLoading title="Carregando usuários…" /></td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr className="table-state"><td colSpan={4}>
                    {hasActiveFilters
                      ? <EmptyState title="Nenhum usuário corresponde à busca e aos filtros">
                          <p>Ajuste os filtros ou limpe todos para ver a equipe inteira.</p>
                          <button type="button" className="btn btn-secondary" onClick={clearFilters}>Limpar filtros</button>
                        </EmptyState>
                      : <EmptyState title="Nenhum usuário cadastrado"><p>Adicione usuários para dar acesso ao sistema.</p></EmptyState>}
                  </td></tr>
                ) : filteredUsers.map((user) => (
                  <tr key={user.userId}>
                    <td className="cell-primary"><div className="user-list-identity">
                      <span className="user-list-avatar">
                        {user.imageUrl ? <img src={user.imageUrl} alt={`Foto de ${user.userName}`} loading="lazy" /> : <span aria-hidden="true">{user.userName.trim().charAt(0).toUpperCase() || "?"}</span>}
                      </span>
                      <span>
                        {user.userName}
                        {user.mustChangePassword && <span className="user-list-pending">Aguardando primeiro acesso</span>}
                      </span>
                    </div></td>
                    <td data-label="Celular" className="cell-muted cell-number">{formatCellNumber(user.userCellNumber)}</td>
                    <td data-label="Cargo"><span className={`tag role-badge ${user.userPosition.toLowerCase()}`}>{roleLabel(user.userPosition)}</span></td>
                    <td className="col-actions">
                      <div className="user-row-actions">
                        {/* A própria senha não se redefine aqui; a pessoa a troca ela mesma. */}
                        {user.userId !== currentUserId && (
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResetTarget(user)} aria-label={`Redefinir senha de ${user.userName}`}>
                            <KeyRound size={14} aria-hidden /> Redefinir senha
                          </button>
                        )}
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleEdit(user)} aria-label={`Editar ${user.userName}`}>
                          <Pencil size={14} aria-hidden /> Editar
                        </button>
                      </div>
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

      <AddModal isOpen={isCreateModalOpen} title="Adicionar usuário" description="Uma senha provisória será gerada para você enviar à pessoa." error={formError} isSubmitting={isSaving} submitText="Adicionar usuário" onClose={closeFormModals} onSubmit={handleCreate}>
        <label>Nome<input autoFocus value={createForm.userName} onChange={(event) => setCreateForm({ ...createForm, userName: event.target.value })} /></label>
        <label>Celular<input inputMode="numeric" placeholder="(99) 99999-9999" value={createForm.userCellNumber} onChange={(event) => setCreateForm({ ...createForm, userCellNumber: formatCellNumber(event.target.value) })} /></label>
        <label>Cargo<select value={createForm.userPosition} onChange={(event) => setCreateForm({ ...createForm, userPosition: event.target.value })}>
          <option value="administrador">Administrador</option><option value="supervisor">Supervisor</option><option value="funcionario">Funcionário</option>
        </select></label>
        <ProfileImagePicker image={createImage} onChange={setCreateImage} disabled={isSaving} />
      </AddModal>

      <EditModal isOpen={isEditModalOpen && editingUser !== null} title="Editar usuário" description={editingUser ? `Atualize os dados de ${editingUser.userName}.` : undefined} error={formError} isSubmitting={isSaving} submitText="Salvar alterações" onClose={closeFormModals} onSubmit={handleUpdate}>
        <label>Nome<input autoFocus value={editForm.userName} onChange={(event) => setEditForm({ ...editForm, userName: event.target.value })} /></label>
        <label>Celular<input inputMode="numeric" placeholder="(99) 99999-9999" value={editForm.userCellNumber} onChange={(event) => setEditForm({ ...editForm, userCellNumber: formatCellNumber(event.target.value) })} /></label>
        <label>Cargo<select value={editForm.userPosition} onChange={(event) => setEditForm({ ...editForm, userPosition: event.target.value })}>
          <option value="administrador">Administrador</option><option value="supervisor">Supervisor</option><option value="funcionario">Funcionário</option>
        </select></label>
      </EditModal>

      <ConfirmModal
        isOpen={resetTarget !== null}
        title="Redefinir senha"
        message={resetTarget ? `Gerar uma nova senha provisória para ${resetTarget.userName}? A senha atual deixa de funcionar na hora.` : undefined}
        confirmText="Gerar nova senha"
        onConfirm={confirmResetPassword}
        onClose={() => setResetTarget(null)}
      />

      {temporaryAccess && (
        <TemporaryAccessModal key={temporaryAccess.temporaryPassword} access={temporaryAccess} formatCellNumber={formatCellNumber} roleLabel={roleLabel} onClose={closeTemporaryAccess} />
      )}

    </div>
  );
}
