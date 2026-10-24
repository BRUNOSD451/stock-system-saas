-- 004_categories_company: categorias passam a pertencer a uma empresa.
--
-- As categorias existentes vão para a Empresa padrão, identificada pela empresa do usuário
-- mais antigo (a operação original), sem depender do nome dela.
-- O nome da categoria passa a ser único por empresa: duas empresas podem ter "Bebidas".

SET @default_company_id = (SELECT `company_id` FROM `users` WHERE `company_id` IS NOT NULL ORDER BY `user_id` LIMIT 1);

ALTER TABLE `categories` ADD COLUMN `company_id` int NULL AFTER `category_id`;

UPDATE `categories` SET `company_id` = @default_company_id;

ALTER TABLE `categories`
  MODIFY `company_id` int NOT NULL,
  DROP INDEX `name`,
  ADD UNIQUE KEY `categories_company_name_unique` (`company_id`, `name`),
  ADD CONSTRAINT `categories_company_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);
