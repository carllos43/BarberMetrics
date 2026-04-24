-- ============================================================================
-- 002_perf_indexes.sql
-- Índices adicionais para acelerar listagens "mais recentes primeiro"
-- (transactions, appointments, bills, personalBills, withdrawals, weeklyCycles).
--
-- Como rodar: abra o painel do Supabase → SQL Editor → cole este arquivo
-- inteiro → Run. CONCURRENTLY = não bloqueia leituras/escritas existentes.
-- IF NOT EXISTS = seguro rodar mais de uma vez.
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS transactions_bs_user_created_idx
  ON transactions (barbershop_id, user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS appointments_bs_user_created_idx
  ON appointments (barbershop_id, user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS bills_bs_user_created_idx
  ON bills (barbershop_id, user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS personal_bills_bs_user_created_idx
  ON personal_bills (barbershop_id, user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS withdrawals_bs_user_created_idx
  ON withdrawals (barbershop_id, user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS weekly_cycles_bs_user_created_idx
  ON weekly_cycles (barbershop_id, user_id, created_at DESC);

-- Atualiza estatísticas para o planner usar os novos índices imediatamente.
ANALYZE transactions;
ANALYZE appointments;
ANALYZE bills;
ANALYZE personal_bills;
ANALYZE withdrawals;
ANALYZE weekly_cycles;
