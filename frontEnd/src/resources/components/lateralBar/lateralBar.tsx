
import { useEffect, useState } from "react";
import type { Company } from "../../types/types";
import { NavLink, useNavigate } from "react-router-dom";
import { Box, Pencil, LayoutDashboard, Bot, Menu, X, Building2, Lock, CreditCard } from "lucide-react";
import ChatModal from "../chatModal/ChatModal";

import EditModal from "../formModal/EditModal";
import ProfileImagePicker from "../profileImage/ProfileImagePicker";
import { UserService } from "../../../services/userService";
import { getErrorMessage } from "../../../services/screenUtils";
import { I } from "../icons/icons";
import "./lateralBar.css";
import getUserData, { COMPANY_UPDATED_EVENT, getCompanyData } from "../../../services/getUserData";
import type { User } from "../../types/types";

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? "nav-item active" : "nav-item";
}

export default function LateralBar() {
  const navigate = useNavigate();

  const [userData, setUserData] = useState<User | null>(null);
  const [company, setCompany] = useState(getCompanyData);

  // A tela Empresa avisa quando nome ou logo mudam, para o menu refletir na hora.
  useEffect(() => {
    const handleCompanyUpdated = (event: Event) => setCompany((event as CustomEvent<Company>).detail);
    window.addEventListener(COMPANY_UPDATED_EVENT, handleCompanyUpdated);
    return () => window.removeEventListener(COMPANY_UPDATED_EVENT, handleCompanyUpdated);
  }, []);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  async function savePhoto(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isUploading) return;
    if (!image) { setPhotoError("Selecione uma imagem."); return; }
    setIsUploading(true);
    setPhotoError("");
    try {
      const user = await UserService.updateImage(image);
      localStorage.setItem("user", JSON.stringify(user));
      setUserData(user);
      setIsPhotoOpen(false);
      setImage(null);
    } catch (error) {
      setPhotoError(getErrorMessage(error, "Não foi possível salvar a foto."));
    } finally {
      setIsUploading(false);
    }
  }

  // Sair encerra a sessão; o celular lembrado no login é mantido.
  function handleSair() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("company");
    navigate("/");
  }

  // Cada tela monta a própria barra; fechar ao clicar cobre o item da tela atual.
  const closeMenu = () => setIsMenuOpen(false);

  useEffect(() => {
    async function loadUserData() {
      try {
        const data = await getUserData();
        setUserData(data);
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    }

    loadUserData();
  }, []);

  const isAdmin = userData?.userPosition === "administrador";

  const isSupervisorOrAdmin =
    userData?.userPosition === "supervisor" ||
    userData?.userPosition === "administrador";

  const initial = userData?.userName.trim().charAt(0).toUpperCase() || "?";

  return (
    <>
    <nav className={`sidebar${isMenuOpen ? " is-open" : ""}`} aria-label="Navegação principal">

      <div className="sidebar-top">
        <div className="sidebar-logo">
          <span className="logo-mark">
            <Box size={18} strokeWidth={2.2} aria-hidden />
          </span>
          <span className="logo-text">
            StockControl
            <span className="logo-company" title={company?.name}>
              {company?.logoUrl && <img className="logo-company-mark" src={company.logoUrl} alt="" />}
              <span>{company?.name ?? "Gestão de estoque"}</span>
            </span>
          </span>
        </div>

        <button
          type="button"
          className="sidebar-menu-toggle"
          aria-expanded={isMenuOpen}
          aria-controls="sidebar-panel"
          aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
        </button>
      </div>

      <div className="sidebar-panel" id="sidebar-panel">
        <div className="sidebar-nav">

          <div className="nav-group">
            <p className="nav-section-label">Principal</p>

            <NavLink to="/home" className={navClass} onClick={closeMenu}>
              {I.home} Início
            </NavLink>

            <NavLink to="/productScreen" className={navClass} onClick={closeMenu}>
              {I.box} Produtos
            </NavLink>

            {isAdmin && (
              <NavLink to="/dashboard" className={navClass} onClick={closeMenu}>
                <LayoutDashboard size={18} strokeWidth={1.8} aria-hidden="true" /> Dashboard
              </NavLink>
            )}

            {/* Only administrator */}
            {isAdmin && (
              <NavLink to="/categoryScreen" className={navClass} onClick={closeMenu}>
                {I.tag} Categorias
              </NavLink>
            )}
          </div>

          {/* Supervisor + Administrator */}
          {isSupervisorOrAdmin && (
            <div className="nav-group">
              <p className="nav-section-label">Movimentação</p>

              <NavLink to="/inputScreen" className={navClass} onClick={closeMenu}>
                {I.arrowDown} Entradas
              </NavLink>

              <NavLink to="/outputScreen" className={navClass} onClick={closeMenu}>
                {I.arrowUp} Saídas
              </NavLink>
            </div>
          )}

          {/* Only administrator */}
          {isAdmin && (
            <div className="nav-group">
              <p className="nav-section-label">Cadastros</p>

              <NavLink to="/supplierScreen" className={navClass} onClick={closeMenu}>
                {I.truck} Fornecedores
              </NavLink>

              <NavLink to="/userScreen" className={navClass} onClick={closeMenu}>
                {I.users} Usuários
              </NavLink>

              <NavLink to="/companyScreen" className={navClass} onClick={closeMenu}>
                <Building2 size={18} strokeWidth={1.8} aria-hidden="true" /> Empresa
              </NavLink>

              <NavLink to="/assinatura" className={navClass} onClick={closeMenu}>
                <CreditCard size={18} strokeWidth={1.8} aria-hidden="true" /> Assinatura
              </NavLink>
            </div>
          )}

        </div>

        {company?.readOnly && (
          <div className="sidebar-subscription" role="status">
            <p className="sidebar-subscription-title">
              <Lock size={14} strokeWidth={2.2} aria-hidden="true" />
              {company.trialExpired ? "Teste encerrado" : company.periodEnded ? "Assinatura vencida" : "Assinatura inativa"}
            </p>
            <p className="sidebar-subscription-text">
              Modo consulta: os dados continuam visíveis, mas não é possível registrar nem alterar nada.
            </p>
            {isAdmin
              ? <NavLink to="/assinatura" className="sidebar-subscription-link" onClick={closeMenu}>{company.periodEnded ? "Renovar o Pro" : "Assinar o Pro"}</NavLink>
              : <p className="sidebar-subscription-text">Fale com o administrador da empresa.</p>}
          </div>
        )}

        {isAdmin && <div className="sidebar-assistant">
          <button type="button" className="nav-item" onClick={() => { closeMenu(); setIsChatOpen(true); }} aria-haspopup="dialog" aria-expanded={isChatOpen}>
            <Bot size={18} strokeWidth={1.8} aria-hidden="true" /> Conversar com a IA
          </button>
        </div>}

        {/* User */}
        <div className="sidebar-footer">
          <div className="user-chip">

            <button type="button" className="user-avatar" aria-label="Alterar foto de perfil" title="Alterar foto de perfil" onClick={() => {
              setImage(null); setPhotoError(""); setIsPhotoOpen(true);
            }}>
              {userData?.imageUrl ? <img src={userData.imageUrl} alt="" /> : <span aria-hidden="true">{initial}</span>}
              <span className="user-avatar-edit"><Pencil size={10} aria-hidden="true" /></span>
            </button>

            <div className="user-info">
              <div className="user-name">
                {userData?.userName}
              </div>

              <div className="user-role">
                {userData?.userPosition}
              </div>
            </div>

            <button
              type="button"
              className="btn-logout"
              onClick={handleSair}
              aria-label="Sair"
              title="Sair"
            >
              {I.logout}
            </button>

          </div>
        </div>
      </div>

    </nav>
    {isAdmin && <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />}
    <EditModal isOpen={isPhotoOpen} title="Foto de perfil" error={photoError} isSubmitting={isUploading} submitText="Salvar foto" onClose={() => { if (!isUploading) setIsPhotoOpen(false); }} onSubmit={savePhoto}>
      <ProfileImagePicker image={image} currentUrl={userData?.imageUrl} onChange={setImage} disabled={isUploading} />
    </EditModal>
    </>
  );
}
