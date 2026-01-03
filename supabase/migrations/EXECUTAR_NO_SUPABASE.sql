-- =====================================================
-- SIGMA UFC - EXECUTE ESTE ARQUIVO INTEIRO NO SUPABASE
-- Vá em SQL Editor > New Query > Cole tudo > Run
-- =====================================================

-- =====================================================
-- PARTE 1: SCHEMA INICIAL
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
  full_name TEXT,
  cpf TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice único para CPF
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cpf ON profiles(cpf) WHERE cpf IS NOT NULL;

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
  UNIQUE(user_id, fight_id),
  CHECK (NOT (predicted_method = 'DEC' AND predicted_round IS NOT NULL)),
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
-- TABELA: payments
-- Controle de pagamentos dos usuários
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
  payment_method TEXT DEFAULT 'pix' CHECK (payment_method IN ('pix', 'credit_card', 'other')),
  pix_transaction_id TEXT,
  reference_month TEXT,
  notes TEXT,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para pagamentos
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_reference_month ON payments(reference_month);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fights ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Profiles are viewable by everyone" 
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- EVENTS
CREATE POLICY "Events are viewable by everyone" 
  ON events FOR SELECT USING (true);

CREATE POLICY "Admins can insert events" 
  ON events FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can update events" 
  ON events FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can delete events" 
  ON events FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- FIGHTS
CREATE POLICY "Fights are viewable by everyone" 
  ON fights FOR SELECT USING (true);

CREATE POLICY "Admins can insert fights" 
  ON fights FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can update fights" 
  ON fights FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can delete fights" 
  ON fights FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- PICKS
CREATE POLICY "Users can view own picks" 
  ON picks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all picks" 
  ON picks FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Users can insert own picks" 
  ON picks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own picks" 
  ON picks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own picks" 
  ON picks FOR DELETE USING (auth.uid() = user_id);

-- RANKINGS
CREATE POLICY "Rankings are viewable by everyone" 
  ON rankings FOR SELECT USING (true);

-- PAYMENTS
CREATE POLICY "Users can view own payments" 
  ON payments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" 
  ON payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can insert payments" 
  ON payments FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can update payments" 
  ON payments FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can delete payments" 
  ON payments FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_fights_updated_at ON fights;
CREATE TRIGGER update_fights_updated_at
  BEFORE UPDATE ON fights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_picks_updated_at ON picks;
CREATE TRIGGER update_picks_updated_at
  BEFORE UPDATE ON picks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_rankings_updated_at ON rankings;
CREATE TRIGGER update_rankings_updated_at
  BEFORE UPDATE ON rankings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- VIEWS
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

CREATE OR REPLACE VIEW payments_with_profiles AS
SELECT 
  pay.id,
  pay.user_id,
  pay.amount,
  pay.status,
  pay.payment_method,
  pay.pix_transaction_id,
  pay.reference_month,
  pay.notes,
  pay.confirmed_at,
  pay.confirmed_by,
  pay.created_at,
  pay.updated_at,
  p.nickname,
  p.avatar_url,
  p.is_admin as user_is_admin,
  confirmer.nickname as confirmed_by_nickname
FROM payments pay
JOIN profiles p ON p.id = pay.user_id
LEFT JOIN profiles confirmer ON confirmer.id = pay.confirmed_by;

CREATE OR REPLACE VIEW users_summary AS
SELECT 
  p.id as user_id,
  p.nickname,
  p.avatar_url,
  p.is_admin,
  p.created_at,
  COALESCE(gr.total_points, 0) as total_points,
  COALESCE(gr.picks_count, 0) as total_picks,
  COALESCE(gr.correct_picks, 0) as correct_picks,
  COALESCE(gr.accuracy, 0) as accuracy,
  (SELECT COUNT(*) FROM payments pay WHERE pay.user_id = p.id AND pay.status = 'confirmed') as confirmed_payments,
  (SELECT SUM(amount) FROM payments pay WHERE pay.user_id = p.id AND pay.status = 'confirmed') as total_paid
FROM profiles p
LEFT JOIN global_ranking gr ON gr.user_id = p.id
ORDER BY p.created_at DESC;

-- =====================================================
-- PRONTO! Agora crie sua conta no app e execute:
-- 
-- SELECT id FROM auth.users WHERE email = 'seu@email.com';
-- UPDATE profiles SET is_admin = true WHERE id = 'ID_RETORNADO';
-- =====================================================



-- ======================================================
-- MIGRATION 006: Remover tabela payments (legado)
-- A tabela 'payments' era usada para pagamentos manuais.
-- Agora usamos 'pix_payments' para tudo via PIX.
-- ======================================================

-- Remover view que depende da tabela
DROP VIEW IF EXISTS payments_with_profiles CASCADE;

-- Atualizar view users_summary para usar pix_payments
CREATE OR REPLACE VIEW users_summary AS
SELECT 
  p.id as user_id,
  p.nickname,
  p.avatar_url,
  p.is_admin,
  p.created_at,
  COALESCE(gr.total_points, 0) as total_points,
  COALESCE(gr.picks_count, 0) as total_picks,
  COALESCE(gr.correct_picks, 0) as correct_picks,
  COALESCE(gr.accuracy, 0) as accuracy,
  (SELECT COUNT(*) FROM pix_payments pp WHERE pp.user_id = p.id AND pp.status = 'PAID') as confirmed_payments,
  (SELECT COALESCE(SUM(amount), 0) FROM pix_payments pp WHERE pp.user_id = p.id AND pp.status = 'PAID') as total_paid
FROM profiles p
LEFT JOIN global_ranking gr ON gr.user_id = p.id
ORDER BY p.created_at DESC;

-- Remover políticas RLS da tabela payments
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON payments;
DROP POLICY IF EXISTS "Admins can update payments" ON payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON payments;

-- Remover trigger
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;

-- Remover tabela payments
DROP TABLE IF EXISTS payments CASCADE;

-- ======================================================
-- FIM DA MIGRATION 006
-- ======================================================




