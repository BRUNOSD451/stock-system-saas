-- 008_notifications_company: notificações passam a pertencer a uma empresa.
-- Cada notificação vai para a empresa do usuário que a recebeu.

SET @default_company_id = (SELECT `company_id` FROM `users` WHERE `company_id` IS NOT NULL ORDER BY `user_id` LIMIT 1);

ALTER TABLE `notifications` ADD COLUMN `company_id` int NULL AFTER `notification_id`;

UPDATE `notifications` n
JOIN `users` u ON u.`user_id` = n.`user_id`
SET n.`company_id` = COALESCE(u.`company_id`, @default_company_id);

ALTER TABLE `notifications`
  MODIFY `company_id` int NOT NULL,
  ADD KEY `notifications_company_user_idx` (`company_id`, `user_id`),
  ADD CONSTRAINT `notifications_company_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);
