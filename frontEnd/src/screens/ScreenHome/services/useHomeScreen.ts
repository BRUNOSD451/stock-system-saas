import { useEffect, useState } from "react";
import { type QuickAction } from "../components/QuickActionModal";
import getUserData from "../../../services/getUserData";
import type { User } from "../../../resources/types/types";
import { getNotifications } from "../../../services/notificationsService";

function formatCurrentDate() {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(new Date());
}

// Centraliza estado, validações e chamadas da tela, preservando os contratos da API.
export function useHomeScreen() {
  const [quickAction, setQuickAction] = useState<QuickAction | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [userData] = useState<User | null>(getUserData);

  useEffect(() => {
    if (!userData?.userId) return;

    const loadNotificationStatus = async () => {
      try {
        const notifications = await getNotifications();
        setHasUnreadNotifications(notifications.some((notification) => Boolean(notification.status)));
      } catch (requestError: unknown) {
        console.error("Error loading notification status:", requestError);
      }
    };

    void loadNotificationStatus();
  }, [userData?.userId]);

  return { formatCurrentDate, quickAction, setQuickAction, isNotificationsOpen, setIsNotificationsOpen, hasUnreadNotifications, setHasUnreadNotifications, userData };
}
