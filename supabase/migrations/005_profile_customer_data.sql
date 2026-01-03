-- =====================================================
-- SIGMA UFC - DADOS DO CLIENTE PARA PIX
-- Adiciona campos nome completo e CPF no perfil
-- =====================================================

-- Adicionar campos para dados do cliente
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Criar índice único para CPF (evitar duplicados)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cpf ON profiles(cpf) WHERE cpf IS NOT NULL;

-- Comentários
COMMENT ON COLUMN profiles.full_name IS 'Nome completo do usuário para pagamentos PIX';
COMMENT ON COLUMN profiles.cpf IS 'CPF do usuário para pagamentos PIX (formato: 000.000.000-00 ou apenas números)';

