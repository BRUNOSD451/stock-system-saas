import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Bell, X } from "lucide-react";
import type { Notification } from "../../../resources/types/types";
import { getNotifications, markNotificationsAsRead } from "../../../services/notificationsService";
import "./notificationModal.css";

interface NotificationModalProps {
  isOpen: boolean;
  userId?: number;
  onClose: () => void;
  onUnreadChange: (hasUnread: boolean) => void;
}

type NotificationFilter = "all" | "unread" | "read";

function getErrorMessage(error: unknown) {
  return error instanceof Error && error.message
    ? error.message
    : "Não foi possível carregar as notificações.";
}

function getNotificationMeta(name: string) {
  const metadata = {
    stockInput: {
      label: "Entrada de estoque",
      className: "notification-item-input",
      icon: <ArrowDown size={17} aria-hidden />,
    },
    stockOutput: {
      label: "Saída de estoque",
      className: "notification-item-output",
      icon: <ArrowUp size={17} aria-hidden />,
    },
    fewProduct: {
      label: "Estoque baixo",
      className: "notification-item-low-stock",
      icon: <AlertTriangle size={17} aria-hidden />,
    },
  } as const;

  return metadata[name as keyof typeof metadata] || {
    label: name,
    className: "notification-item-default",
    icon: <Bell size={17} aria-hidden />,
  };
}

export default function NotificationModal({ isOpen, userId, onClose, onUnreadChange }: NotificationModalProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<NotificationFilter>("unread");
  const [hasUnreadInModal, setHasUnreadInModal] = useState(false);


  useEffect(() => {
    if (!isOpen) return;

    const loadNotifications = async () => {
      if (!userId) {
        setNotifications([]);
        setError("Usuário autenticado não encontrado.");
        return;
      }

      try {
        setIsLoading(true);
        setError("");
        const loadedNotifications = await getNotifications();
        setNotifications(loadedNotifications);
        const hasUnread = loadedNotifications.some((notification) => Boolean(notification.status));
        setHasUnreadInModal(hasUnread);
        onUnreadChange(hasUnread);
      } catch (requestError: unknown) {
        setError(getErrorMessage(requestError));
      } finally {
        setIsLoading(false);
      }
    };

    void loadNotifications();
  }, [isOpen, onUnreadChange, userId]);

  const handleClose = useCallback(async () => {
    onClose();

    if (!hasUnreadInModal) return;

    try {
      await markNotificationsAsRead();
      onUnreadChange(false);
      setHasUnreadInModal(false);
    } catch (requestError: unknown) {
      console.error("Error marking notifications as read:", requestError);
    }
  }, [hasUnreadInModal, onClose, onUnreadChange]);

  const visibleNotifications = notifications.filter((notification) => {
    if (filter === "unread") return Boolean(notification.status);
    if (filter === "read") return !notification.status;
    return true;
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") void handleClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="notification-modal-backdrop" onClick={() => void handleClose()}>
      <aside
        className="notification-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-drawer-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="notification-drawer-header">
          <h2 id="notification-drawer-title">Notificações</h2>
          <button type="button" className="notification-drawer-close" onClick={() => void handleClose()} aria-label="Fechar notificações">
            <X size={19} aria-hidden />
          </button>
        </header>

        <div className="notification-drawer-content">
          <div className="notification-filters" role="group" aria-label="Filtrar notificações">
            <button type="button" className={filter === "all" ? "is-active" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Todas</button>
            <button type="button" className={filter === "unread" ? "is-active" : ""} aria-pressed={filter === "unread"} onClick={() => setFilter("unread")}>Não lidas</button>
            <button type="button" className={filter === "read" ? "is-active" : ""} aria-pressed={filter === "read"} onClick={() => setFilter("read")}>Lidas</button>
          </div>
          {isLoading && <p className="notification-state">Carregando notificações...</p>}
          {!isLoading && error && <p className="notification-state notification-state-error" role="alert">{error}</p>}
          {!isLoading && !error && visibleNotifications.length === 0 && (
            <div className="notification-state notification-empty">
              <Bell size={25} aria-hidden />
              <p>{notifications.length === 0 ? "Nenhuma notificação por aqui." : "Nenhuma notificação neste filtro."}</p>
              <span>{notifications.length === 0 ? "Novos avisos aparecerão nesta área." : "Tente selecionar outro filtro."}</span>
            </div>
          )}
          {!isLoading && !error && visibleNotifications.length > 0 && (
            <ul className="notification-list">
              {visibleNotifications.map((notification) => (
                <li className={`notification-item ${getNotificationMeta(notification.notificationName).className}${notification.status ? " is-unread" : ""}`} key={notification.notificationId}>
                  <span className="notification-item-icon" aria-hidden>
                    {getNotificationMeta(notification.notificationName).icon}
                  </span>
                  <div>
                    <strong>{getNotificationMeta(notification.notificationName).label}</strong>
                    <p>{notification.notificationText}</p>
                    <time className="notification-date" dateTime={notification.createdAt}>
                      {new Date(notification.createdAt).toLocaleString('pt-BR')}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
