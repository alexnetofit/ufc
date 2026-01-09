-- =============================================
-- MIGRATION 003: Tabela Fighters para Cache de Fotos
-- =============================================

-- Tabela para armazenar informações dos lutadores e URLs das fotos
CREATE TABLE IF NOT EXISTS fighters (
  id SERIAL PRIMARY KEY,
  api_id INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por api_id
CREATE INDEX IF NOT EXISTS idx_fighters_api_id ON fighters(api_id);

-- Índice para limpeza de fighters antigos
CREATE INDEX IF NOT EXISTS idx_fighters_updated_at ON fighters(updated_at);

-- Comentários
COMMENT ON TABLE fighters IS 'Cache de informações dos lutadores com URLs das fotos no Storage';
COMMENT ON COLUMN fighters.api_id IS 'ID do lutador na API externa (MMA API)';
COMMENT ON COLUMN fighters.image_url IS 'URL da foto no Supabase Storage';
COMMENT ON COLUMN fighters.updated_at IS 'Última vez que o lutador apareceu em um sync (usado para limpeza)';

-- =============================================
-- STORAGE: Criar bucket para fotos dos lutadores
-- =============================================
-- NOTA: Executar manualmente no Supabase Dashboard:
-- 1. Ir em Storage > Create new bucket
-- 2. Nome: "fighters"
-- 3. Public bucket: SIM (para acesso direto às imagens)
-- =============================================








