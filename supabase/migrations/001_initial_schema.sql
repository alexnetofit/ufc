-- =====================================================
-- FANTASY MMA - SCHEMA INICIAL
-- =====================================================

-- Habilitar extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABELA: profiles
-- Perfis dos usuários (nickname e avatar)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para criar profile automaticamente ao registrar
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 4));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- TABELA: events
-- Eventos do UFC (UFC 306, UFC 307, etc)
-- =====================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para busca por data
CREATE INDEX IF NOT EXISTS idx_events_scheduled_date ON events(scheduled_date);

-- =====================================================
-- TABELA: fights
-- Lutas individuais
-- =====================================================
CREATE TABLE IF NOT EXISTS fights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  api_id TEXT UNIQUE NOT NULL,
  fighter1_name TEXT NOT NULL,
  fighter1_id INTEGER NOT NULL,
  fighter2_name TEXT NOT NULL,
  fighter2_id INTEGER NOT NULL,
  weight_class TEXT,
  fight_type TEXT DEFAULT 'prelims',
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished', 'cancelled')),
  winner_code INTEGER CHECK (winner_code IN (1, 2)),
  win_type TEXT CHECK (win_type IN ('UD', 'SD', 'MD', 'KO', 'TKO', 'SUB', 'DQ', 'NC')),
  round INTEGER CHECK (round >= 1 AND round <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para buscas frequentes
CREATE INDEX IF NOT EXISTS idx_fights_event_id ON fights(event_id);
CREATE INDEX IF NOT EXISTS idx_fights_scheduled_for ON fights(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_fights_status ON fights(status);

-- =====================================================
-- TABELA: picks
-- Palpites dos usuários
-- =====================================================
CREATE TABLE IF NOT EXISTS picks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  fight_id UUID REFERENCES fights(id) ON DELETE CASCADE,
  predicted_winner INTEGER NOT NULL CHECK (predicted_winner IN (1, 2)),
  predicted_method TEXT CHECK (predicted_method IN ('KO', 'SUB', 'DEC')),
  predicted_round INTEGER CHECK (predicted_round >= 1 AND predicted_round <= 5),
  predicted_decision TEXT CHECK (predicted_decision IN ('Unânime', 'Dividida', 'Maioria')),
  points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- Um palpite por usuário por luta
  UNIQUE(user_id, fight_id),
  -- Validação: se método é DEC, não pode ter round
  CHECK (NOT (predicted_method = 'DEC' AND predicted_round IS NOT NULL)),
  -- Validação: se método é KO ou SUB, não pode ter decisão
  CHECK (NOT (predicted_method IN ('KO', 'SUB') AND predicted_decision IS NOT NULL))
);

-- Índices para buscas frequentes
CREATE INDEX IF NOT EXISTS idx_picks_user_id ON picks(user_id);
CREATE INDEX IF NOT EXISTS idx_picks_fight_id ON picks(fight_id);

-- =====================================================
-- TABELA: rankings
-- Rankings por evento (cache de pontuação)
-- =====================================================
CREATE TABLE IF NOT EXISTS rankings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  picks_count INTEGER DEFAULT 0,
  correct_picks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- Índices para ranking
CREATE INDEX IF NOT EXISTS idx_rankings_event_total ON rankings(event_id, total_points DESC);
CREATE INDEX IF NOT EXISTS idx_rankings_user_id ON rankings(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fights ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;

-- PROFILES: Usuários podem ver todos, mas só editar o próprio
CREATE POLICY "Profiles are viewable by everyone" 
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- EVENTS: Todos podem ver
CREATE POLICY "Events are viewable by everyone" 
  ON events FOR SELECT USING (true);

-- FIGHTS: Todos podem ver
CREATE POLICY "Fights are viewable by everyone" 
  ON fights FOR SELECT USING (true);

-- PICKS: Usuários podem ver e editar seus próprios palpites
CREATE POLICY "Users can view own picks" 
  ON picks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own picks" 
  ON picks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own picks" 
  ON picks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own picks" 
  ON picks FOR DELETE USING (auth.uid() = user_id);

-- RANKINGS: Todos podem ver
CREATE POLICY "Rankings are viewable by everyone" 
  ON rankings FOR SELECT USING (true);

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_fights_updated_at
  BEFORE UPDATE ON fights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_picks_updated_at
  BEFORE UPDATE ON picks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_rankings_updated_at
  BEFORE UPDATE ON rankings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- VIEW: ranking_with_profiles
-- View para facilitar consultas de ranking
-- =====================================================
CREATE OR REPLACE VIEW ranking_with_profiles AS
SELECT 
  r.id,
  r.user_id,
  r.event_id,
  r.total_points,
  r.picks_count,
  r.correct_picks,
  p.nickname,
  p.avatar_url,
  e.name as event_name,
  e.scheduled_date as event_date
FROM rankings r
JOIN profiles p ON p.id = r.user_id
JOIN events e ON e.id = r.event_id
ORDER BY r.total_points DESC;

-- =====================================================
-- VIEW: global_ranking
-- View para ranking global (soma de todos eventos)
-- =====================================================
CREATE OR REPLACE VIEW global_ranking AS
SELECT 
  p.id as user_id,
  p.nickname,
  p.avatar_url,
  COALESCE(SUM(r.total_points), 0) as total_points,
  COALESCE(SUM(r.picks_count), 0) as picks_count,
  COALESCE(SUM(r.correct_picks), 0) as correct_picks,
  CASE 
    WHEN COALESCE(SUM(r.picks_count), 0) > 0 
    THEN ROUND((COALESCE(SUM(r.correct_picks), 0)::numeric / SUM(r.picks_count)) * 100, 1)
    ELSE 0 
  END as accuracy
FROM profiles p
LEFT JOIN rankings r ON r.user_id = p.id
GROUP BY p.id, p.nickname, p.avatar_url
ORDER BY total_points DESC;

