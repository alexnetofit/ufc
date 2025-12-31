-- =====================================================
-- FANTASY MMA - ADMIN E PAGAMENTOS
-- =====================================================

-- =====================================================
-- ADICIONAR CAMPO is_admin NA TABELA profiles
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Índice para buscar admins rapidamente
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

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
  reference_month TEXT, -- Formato: YYYY-MM (ex: 2025-01)
  notes TEXT,
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para buscas frequentes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_reference_month ON payments(reference_month);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY PARA payments
-- =====================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver seus próprios pagamentos
CREATE POLICY "Users can view own payments" 
  ON payments FOR SELECT USING (auth.uid() = user_id);

-- Admins podem ver todos os pagamentos
CREATE POLICY "Admins can view all payments" 
  ON payments FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Admins podem inserir pagamentos
CREATE POLICY "Admins can insert payments" 
  ON payments FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Admins podem atualizar pagamentos
CREATE POLICY "Admins can update payments" 
  ON payments FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Admins podem deletar pagamentos
CREATE POLICY "Admins can delete payments" 
  ON payments FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- =====================================================
-- POLICIES DE ADMIN PARA OUTRAS TABELAS
-- =====================================================

-- Admins podem inserir eventos
CREATE POLICY "Admins can insert events" 
  ON events FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Admins podem atualizar eventos
CREATE POLICY "Admins can update events" 
  ON events FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Admins podem deletar eventos
CREATE POLICY "Admins can delete events" 
  ON events FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Admins podem inserir lutas
CREATE POLICY "Admins can insert fights" 
  ON fights FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Admins podem atualizar lutas
CREATE POLICY "Admins can update fights" 
  ON fights FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Admins podem deletar lutas
CREATE POLICY "Admins can delete fights" 
  ON fights FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Admins podem ver todos os picks (para análise)
CREATE POLICY "Admins can view all picks" 
  ON picks FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- =====================================================
-- VIEW: payments_with_profiles
-- View para facilitar consultas de pagamentos
-- =====================================================
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

-- =====================================================
-- VIEW: users_summary
-- View para listar usuários com estatísticas
-- =====================================================
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
  (
    SELECT COUNT(*) 
    FROM payments pay 
    WHERE pay.user_id = p.id 
    AND pay.status = 'confirmed'
  ) as confirmed_payments,
  (
    SELECT SUM(amount) 
    FROM payments pay 
    WHERE pay.user_id = p.id 
    AND pay.status = 'confirmed'
  ) as total_paid
FROM profiles p
LEFT JOIN global_ranking gr ON gr.user_id = p.id
ORDER BY p.created_at DESC;

