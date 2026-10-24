-- 003_users_company: cada usuário passa a pertencer a uma empresa.
--
-- 1. Cria a "Empresa padrão" para os dados que existiam antes do SaaS.
-- 2. Adiciona users.company_id.
-- 3. Liga cada administrador criado pelo /signup à empresa que ele criou (companies.owner_user_id).
-- 4. Liga todos os demais usuários à Empresa padrão.
--
-- company_id fica opcional (NULL) por enquanto: o signup e a tela de Usuários ainda não
-- enviam essa coluna no INSERT. Ela vira NOT NULL numa migration futura, depois que o código
-- passar a preenchê-la.

-- 1. Empresa padrão. O id é guardado na sessão para não depender de qual número ela recebe.
INSERT INTO `companies` (`name`, `email`, `plan`, `status`)
VALUES ('Empresa padrão', 'contato@empresa-padrao.local', 'pro', 'active');

SET @default_company_id = LAST_INSERT_ID();

-- 2. Nova coluna, com índice e chave estrangeira.
ALTER TABLE `users`
  ADD COLUMN `company_id` int NULL AFTER `user_id`,
  ADD KEY `users_company_idx` (`company_id`),
  ADD CONSTRAINT `users_company_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

-- 3. Quem criou uma empresa pelo /signup pertence a ela.
UPDATE `users` u
JOIN `companies` c ON c.`owner_user_id` = u.`user_id`
SET u.`company_id` = c.`company_id`;

-- 4. Todos os outros usuários são da operação que já existia.
UPDATE `users`
SET `company_id` = @default_company_id
WHERE `company_id` IS NULL;

-- O dono da Empresa padrão é o administrador mais antigo dela.
UPDATE `companies`
SET `owner_user_id` = (
  SELECT `user_id` FROM `users`
  WHERE `company_id` = @default_company_id AND `user_position` = 'administrador'
  ORDER BY `user_id`
  LIMIT 1
)
WHERE `company_id` = @default_company_id;
