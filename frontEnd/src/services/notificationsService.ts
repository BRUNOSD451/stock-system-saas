import { apiController } from "./Api";
import type { Notification } from "../resources/types/types";

export function getNotifications() {
  return apiController.post<Notification[]>("/notifications", {});
}

export function markNotificationsAsRead() {
  return apiController.patch<void>("/notifications/read", {});
}
