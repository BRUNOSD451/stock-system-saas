-- 012_products_units_movement_kinds: unidade, código e situação dos produtos; tipos de movimentação.
-- Só acrescenta colunas com padrão que mantém o comportamento atual: produtos existentes ficam
-- ativos, em "un" e sem código; movimentações existentes ficam como "regular".

-- Produtos: código (SKU ou código de barras, único por empresa), unidade de medida e inativação.
-- Vários produtos sem código são permitidos: o índice único ignora NULL.
ALTER TABLE `products`
  ADD COLUMN `sku` varchar(60) NULL DEFAULT NULL AFTER `name`,
  ADD COLUMN `unit` varchar(10) NOT NULL DEFAULT 'un' AFTER `stock_quantity`,
  ADD COLUMN `active` tinyint(1) NOT NULL DEFAULT 1 AFTER `image_url`,
  ADD UNIQUE KEY `products_company_sku_unique` (`company_id`, `sku`);

-- Tipo da movimentação:
--   regular    entrada ou saída comum
--   reversal   estorno: desfaz uma movimentação regular do tipo oposto
--   adjustment ajuste de inventário: corrige o saldo após uma contagem física
-- O estorno aponta para a movimentação desfeita; o índice único garante um estorno por movimentação.
ALTER TABLE `stock_inputs`
  ADD COLUMN `kind` enum('regular','reversal','adjustment') NOT NULL DEFAULT 'regular' AFTER `observation`,
  ADD COLUMN `reverses_output_id` int NULL DEFAULT NULL AFTER `kind`,
  ADD UNIQUE KEY `stock_inputs_reverses_output_unique` (`reverses_output_id`);

ALTER TABLE `stock_outputs`
  ADD COLUMN `kind` enum('regular','reversal','adjustment') NOT NULL DEFAULT 'regular' AFTER `observation`,
  ADD COLUMN `reverses_input_id` int NULL DEFAULT NULL AFTER `kind`,
  ADD UNIQUE KEY `stock_outputs_reverses_input_unique` (`reverses_input_id`);

-- Chaves estrangeiras depois das duas colunas existirem (uma tabela aponta para a outra).
ALTER TABLE `stock_inputs`
  ADD CONSTRAINT `stock_inputs_reverses_output_fk` FOREIGN KEY (`reverses_output_id`) REFERENCES `stock_outputs` (`stock_output_id`);

ALTER TABLE `stock_outputs`
  ADD CONSTRAINT `stock_outputs_reverses_input_fk` FOREIGN KEY (`reverses_input_id`) REFERENCES `stock_inputs` (`stock_input_id`);
