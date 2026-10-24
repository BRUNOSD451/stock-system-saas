import "../style/homeStyle.css";
import { ArrowDown, ArrowUp, Box, Truck } from "lucide-react";
import { I } from "../../../resources/components/icons/icons";
import LateralBar from "../../../resources/components/lateralBar/lateralBar";
import LowStockPanel from "../../../resources/components/lowStock/LowStockPanel";
import { useLowStock } from "../../../resources/components/lowStock/useLowStock";
import NotificationModal from "../components/NotificationModal";
import QuickActionModal from "../components/QuickActionModal";
import { useHomeScreen } from "../services/useHomeScreen";

export default function HomeScreen() {
  const { formatCurrentDate, quickAction, setQuickAction, isNotificationsOpen, setIsNotificationsOpen,
    hasUnreadNotifications, setHasUnreadNotifications, userData } = useHomeScreen();
  const { lowStock, threshold, error: lowStockError, reload: reloadLowStock } = useLowStock();

  const firstName = userData?.userName.trim().split(/\s+/)[0];


  return (
    <div className="app-layout">
      <LateralBar />
      <main className="page">
        <div className="page-inner">
          <header className="page-header">
            <div className="page-heading">
              <h1 className="page-title">{firstName ? `Olá, ${firstName}` : "Início"}</h1>
              <p className="page-subtitle home-date">{formatCurrentDate()}</p>
            </div>
            <div className="page-actions">
              <button className="icon-btn" type="button" onClick={() => setIsNotificationsOpen(true)} aria-label={hasUnreadNotifications ? "Abrir notificações, há notificações não lidas" : "Abrir notificações"}>
                {I.bell}{hasUnreadNotifications && <span className="notif-dot" aria-hidden="true" />}
              </button>
            </div>
          </header>

          <div className="home-layout">
            <div className="home-main">
              {/* Entradas e saídas são as ações mais frequentes e ganham os blocos maiores. */}
              <section className="home-section" aria-labelledby="movement-actions-title">
                <h2 id="movement-actions-title" className="section-title home-section-title">Registrar movimentação</h2>
                <div className="dock-actions">
                  <button className="dock-btn is-in" type="button" onClick={() => setQuickAction("input")}>
                    <span className="dock-btn-icon"><ArrowDown size={22} strokeWidth={2} aria-hidden /></span>
                    <span>
                      <span className="dock-btn-label">Nova entrada</span>
                      <span className="dock-btn-hint">Produtos que chegaram ao estoque</span>
                    </span>
                  </button>
                  <button className="dock-btn is-out" type="button" onClick={() => setQuickAction("output")}>
                    <span className="dock-btn-icon"><ArrowUp size={22} strokeWidth={2} aria-hidden /></span>
                    <span>
                      <span className="dock-btn-label">Nova saída</span>
                      <span className="dock-btn-hint">Produtos retirados do estoque</span>
                    </span>
                  </button>
                </div>
              </section>

              {userData?.userPosition !== "funcionario" && (
                <section className="home-section" aria-labelledby="register-actions-title">
                  <h2 id="register-actions-title" className="section-title home-section-title">Cadastros</h2>
                  <div className="register-actions">
                    <button className="btn btn-secondary" type="button" onClick={() => setQuickAction("product")}>
                      <Box size={16} strokeWidth={1.8} aria-hidden /> Adicionar produto
                    </button>
                    <button className="btn btn-secondary" type="button" onClick={() => setQuickAction("supplier")}>
                      <Truck size={16} strokeWidth={1.8} aria-hidden /> Adicionar fornecedor
                    </button>
                  </div>
                </section>
              )}
            </div>

            <LowStockPanel lowStock={lowStock} threshold={threshold} error={lowStockError} />
          </div>
        </div>
      </main>
      {/* Entradas, saídas e produtos novos mudam os saldos: a lista de reposição é refeita. */}
      <QuickActionModal action={quickAction} onClose={() => setQuickAction(null)} onCompleted={() => void reloadLowStock()} />
      <NotificationModal isOpen={isNotificationsOpen} userId={userData?.userId} onClose={() => setIsNotificationsOpen(false)} onUnreadChange={setHasUnreadNotifications} />
    </div>
  );
}
