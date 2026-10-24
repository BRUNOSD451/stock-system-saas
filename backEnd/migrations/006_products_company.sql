-- 006_products_company: produtos passam a pertencer a uma empresa.
--
-- Cada produto vai para a empresa da sua categoria (categorias já têm dono desde a 004).
-- Assim, produtos criados com categorias de uma empresa nova durante os testes ficam nela.
-- Se o fornecedor do produto for de outra empresa, o vínculo é desfeito (supplier_id = NULL),
-- porque um produto não pode apontar para um fornecedor de outro cliente.

ALTER TABLE `products` ADD COLUMN `company_id` int NULL AFTER `product_id`;

UPDATE `products` p
JOIN `categories` c ON c.`category_id` = p.`category_id`
SET p.`company_id` = c.`company_id`;

UPDATE `products` p
JOIN `suppliers` s ON s.`supplier_id` = p.`supplier_id`
SET p.`supplier_id` = NULL
WHERE s.`company_id` <> p.`company_id`;

ALTER TABLE `products`
  MODIFY `company_id` int NOT NULL,
  ADD KEY `products_company_idx` (`company_id`),
  ADD CONSTRAINT `products_company_fk` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`);
