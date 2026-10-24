-- 005_suppliers_company: fornecedores passam a pertencer a uma empresa.
-- Os existentes vão para a Empresa padrão (empresa do usuário mais antigo).

SET @default_company_id = (SELECT `company_id` FROM `users` WHERE `company_id` IS NOT NULL ORDER BY `user_id` LIMIT 1);

ALTER TABLE `suppliers` ADD COLUMN `company_id` int NULL AFTER `supplier_id`;

UPDATE `suppliers` SET `company_id` = @default_company_id;

ALTER TABLE `suppliers`
  MODIFY `company_id` int NOT NULL,
  ADD KEY `suppliers_company_idx` (`company_id`),
  ADD CONSTRAINT `suppliers_company_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);
