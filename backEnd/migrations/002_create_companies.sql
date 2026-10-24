-- 002_create_companies: empresas (tenants) do SaaS.
-- Por enquanto as demais tabelas não mudam; a empresa se liga ao administrador que a criou
-- por owner_user_id. O vínculo users.company_id virá numa migration posterior.

CREATE TABLE `companies` (
  `company_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `email` varchar(150) NOT NULL,
  `logo_url` varchar(500) DEFAULT NULL,
  `plan` varchar(30) NOT NULL DEFAULT 'free',
  `status` enum('trial','active','past_due','canceled','suspended') NOT NULL DEFAULT 'trial',
  `trial_ends_at` timestamp NULL DEFAULT NULL,
  `low_stock_threshold` int NOT NULL DEFAULT 10,
  `owner_user_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`company_id`),
  KEY `companies_owner_idx` (`owner_user_id`),
  CONSTRAINT `companies_owner_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `companies_chk_threshold` CHECK ((`low_stock_threshold` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
