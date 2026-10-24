-- 007_movements_company: entradas, saídas e seus itens passam a pertencer a uma empresa.
--
-- Cada movimentação vai para a empresa de quem a registrou. Se o autor foi removido (user_id NULL),
-- usa a empresa do primeiro produto da movimentação; se não houver itens, a Empresa padrão.
-- Os itens herdam a empresa da movimentação a que pertencem.

SET @default_company_id = (SELECT `company_id` FROM `users` WHERE `company_id` IS NOT NULL ORDER BY `user_id` LIMIT 1);

ALTER TABLE `stock_inputs`  ADD COLUMN `company_id` int NULL AFTER `stock_input_id`;
ALTER TABLE `stock_outputs` ADD COLUMN `company_id` int NULL AFTER `stock_output_id`;
ALTER TABLE `input_items`   ADD COLUMN `company_id` int NULL AFTER `input_item_id`;
ALTER TABLE `output_items`  ADD COLUMN `company_id` int NULL AFTER `output_item_id`;

-- Entradas
UPDATE `stock_inputs` s
JOIN `users` u ON u.`user_id` = s.`user_id`
SET s.`company_id` = u.`company_id`;

UPDATE `stock_inputs` s
SET s.`company_id` = (
  SELECT p.`company_id` FROM `input_items` i JOIN `products` p ON p.`product_id` = i.`product_id`
  WHERE i.`stock_input_id` = s.`stock_input_id` ORDER BY i.`input_item_id` LIMIT 1
)
WHERE s.`company_id` IS NULL;

UPDATE `stock_inputs` SET `company_id` = @default_company_id WHERE `company_id` IS NULL;

UPDATE `input_items` i
JOIN `stock_inputs` s ON s.`stock_input_id` = i.`stock_input_id`
SET i.`company_id` = s.`company_id`;

-- Saídas
UPDATE `stock_outputs` s
JOIN `users` u ON u.`user_id` = s.`user_id`
SET s.`company_id` = u.`company_id`;

UPDATE `stock_outputs` s
SET s.`company_id` = (
  SELECT p.`company_id` FROM `output_items` i JOIN `products` p ON p.`product_id` = i.`product_id`
  WHERE i.`stock_output_id` = s.`stock_output_id` ORDER BY i.`output_item_id` LIMIT 1
)
WHERE s.`company_id` IS NULL;

UPDATE `stock_outputs` SET `company_id` = @default_company_id WHERE `company_id` IS NULL;

UPDATE `output_items` i
JOIN `stock_outputs` s ON s.`stock_output_id` = i.`stock_output_id`
SET i.`company_id` = s.`company_id`;

-- Obrigatório, com índice para as listagens por empresa e data.
ALTER TABLE `stock_inputs`
  MODIFY `company_id` int NOT NULL,
  ADD KEY `stock_inputs_company_created_idx` (`company_id`, `created_at`),
  ADD CONSTRAINT `stock_inputs_company_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

ALTER TABLE `stock_outputs`
  MODIFY `company_id` int NOT NULL,
  ADD KEY `stock_outputs_company_created_idx` (`company_id`, `created_at`),
  ADD CONSTRAINT `stock_outputs_company_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

ALTER TABLE `input_items`
  MODIFY `company_id` int NOT NULL,
  ADD KEY `input_items_company_idx` (`company_id`),
  ADD CONSTRAINT `input_items_company_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);

ALTER TABLE `output_items`
  MODIFY `company_id` int NOT NULL,
  ADD KEY `output_items_company_idx` (`company_id`),
  ADD CONSTRAINT `output_items_company_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);
