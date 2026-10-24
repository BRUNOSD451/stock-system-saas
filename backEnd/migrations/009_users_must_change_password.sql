-- 009_users_must_change_password: senha provisória.
-- Usuários criados ou com senha redefinida pelo administrador recebem uma senha provisória
-- e precisam criar a própria senha no primeiro acesso. Usuários existentes não são afetados.

ALTER TABLE `users`
  ADD COLUMN `must_change_password` tinyint(1) NOT NULL DEFAULT 0 AFTER `password`;
