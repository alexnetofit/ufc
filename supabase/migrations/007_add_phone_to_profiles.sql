-- =====================================================
-- SIGMA UFC - ADICIONAR TELEFONE AO PERFIL
-- Adiciona campo phone para WhatsApp no perfil
-- =====================================================

-- Adicionar coluna phone
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Comentário
COMMENT ON COLUMN profiles.phone IS 'Telefone/WhatsApp do usuário (apenas números com DDD)';
