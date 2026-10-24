import { db } from "../database/db"
interface  newNotification{
    name:string,
    notificationText:string
}

// Notificações são da empresa: só administradores e supervisores dela recebem os avisos.
class NotificationRepository{



async findByUserId(companyId: number, userId: number) {
    const result = await db.query(
        `SELECT notification_id, notification_name, notification_text, status, user_id , createdAt
         FROM notifications
         WHERE company_id = ? AND user_id = ?
         ORDER BY notification_id DESC`,
        [companyId, userId]
    );

    return result.rows;
}

async markAsReadByUserId(companyId: number, userId: number) {
    await db.query(
        `UPDATE notifications
         SET status = 0
         WHERE company_id = ? AND user_id = ? AND status = 1`,
        [companyId, userId]
    );
}


async createNotification(companyId: number, newNotification: newNotification) {
    if (!["stockInput", "stockOutput", "fewProduct"].includes(newNotification.name)) {
        throw new Error("Unknown notification type");
    }

    // Os três tipos de aviso têm os mesmos destinatários; cada usuário recebe sua própria leitura.
    const usersNotificatedData = await db.query(
        `SELECT user_id FROM users WHERE company_id = ? AND user_position IN ('administrador', 'supervisor')`,
        [companyId]
    );

    const usersNotificated = usersNotificatedData.rows;

    await Promise.all(
        usersNotificated.map((user) => {
            return db.query(`INSERT INTO notifications (company_id, notification_name, notification_text, status, user_id) VALUES (?, ?, ?, ?, ?)`, [companyId, newNotification.name, newNotification.notificationText, true, user.userId]);
        })
    );
}




}

export const notificationRepository = new NotificationRepository()
