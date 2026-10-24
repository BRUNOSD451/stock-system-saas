-- 011_companies_period_end: fim do período pago da assinatura (cobrança mensal).
-- Cada pagamento confirmado vale 1 mês; passada esta data, a empresa volta ao modo consulta.
-- NULL = sem vencimento (empresas ativadas manualmente antes da cobrança, como a empresa padrão).

ALTER TABLE `companies`
  ADD COLUMN `current_period_end` timestamp NULL DEFAULT NULL AFTER `trial_ends_at`;
