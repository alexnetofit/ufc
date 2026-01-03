-- ======================================================
-- MIGRATION: Remover tabela payments (legado)
-- Data: 2026-01-03
-- Descrição: A tabela 'payments' era usada para pagamentos 
-- manuais. Agora usamos 'pix_payments' para tudo via PIX.
-- ======================================================

-- Remover view que depende da tabela
DROP VIEW IF EXISTS payments_with_profiles CASCADE;

-- Remover políticas RLS
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON payments;
DROP POLICY IF EXISTS "Admins can update payments" ON payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON payments;

-- Remover trigger
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;

-- Remover tabela
DROP TABLE IF EXISTS payments CASCADE;

-- ======================================================
-- FIM DA MIGRATION
-- ======================================================

