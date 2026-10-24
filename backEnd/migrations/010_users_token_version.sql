-- 010_users_token_version: permite encerrar sessões abertas.
-- O token guarda a versão vigente; ao trocar ou redefinir a senha a versão sobe e os tokens
-- antigos deixam de valer. Tokens emitidos antes desta migration valem como versão 0.

ALTER TABLE `users`
  ADD COLUMN `token_version` int NOT NULL DEFAULT 0 AFTER `must_change_password`;
