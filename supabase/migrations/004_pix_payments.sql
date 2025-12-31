-- =====================================================
-- FANTASY MMA - PIX PAYMENTS (AbacatePay)
-- =====================================================

-- =====================================================
-- TABELA: pix_payments
-- Armazena cobrancas PIX para participacao em eventos
-- =====================================================
CREATE TABLE IF NOT EXISTS pix_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount IN (500, 1000, 2000)), -- Valores em centavos
  pix_id TEXT NOT NULL UNIQUE, -- ID retornado pela AbacatePay
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED')),
  br_code TEXT NOT NULL, -- Codigo copia e cola
  br_code_base64 TEXT, -- QR Code em base64
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ
);

-- Indices para buscas frequentes
CREATE INDEX IF NOT EXISTS idx_pix_payments_user_status ON pix_payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pix_payments_event_user ON pix_payments(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_pix_payments_pix_id ON pix_payments(pix_id);
CREATE INDEX IF NOT EXISTS idx_pix_payments_expires_at ON pix_payments(expires_at);

-- =====================================================
-- TABELA: event_entries
-- Registra participacao paga do usuario em evento
-- =====================================================
CREATE TABLE IF NOT EXISTS event_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Valor pago em centavos
  pix_payment_id UUID REFERENCES pix_payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Um usuario so pode ter uma entrada por evento
  CONSTRAINT unique_user_event_entry UNIQUE (user_id, event_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_event_entries_user ON event_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_event_entries_event ON event_entries(event_id);

-- =====================================================
-- ROW LEVEL SECURITY - pix_payments
-- =====================================================
ALTER TABLE pix_payments ENABLE ROW LEVEL SECURITY;

-- Usuarios podem ver seus proprios pagamentos PIX
CREATE POLICY "Users can view own pix_payments" 
  ON pix_payments FOR SELECT 
  USING (auth.uid() = user_id);

-- Usuarios podem inserir seus proprios pagamentos (via API autenticada)
CREATE POLICY "Users can insert own pix_payments" 
  ON pix_payments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Updates sao feitos via service role (server-side)
-- Nao criamos policy de UPDATE para usuarios normais

-- Admins podem ver todos os pagamentos PIX
CREATE POLICY "Admins can view all pix_payments" 
  ON pix_payments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Admins podem atualizar pagamentos PIX
CREATE POLICY "Admins can update pix_payments" 
  ON pix_payments FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- =====================================================
-- ROW LEVEL SECURITY - event_entries
-- =====================================================
ALTER TABLE event_entries ENABLE ROW LEVEL SECURITY;

-- Usuarios podem ver suas proprias entradas
CREATE POLICY "Users can view own event_entries" 
  ON event_entries FOR SELECT 
  USING (auth.uid() = user_id);

-- Usuarios podem inserir suas proprias entradas (via API autenticada)
CREATE POLICY "Users can insert own event_entries" 
  ON event_entries FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Admins podem ver todas as entradas
CREATE POLICY "Admins can view all event_entries" 
  ON event_entries FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- =====================================================
-- VIEW: pix_payments_with_details
-- View para consultas com dados do evento e usuario
-- =====================================================
CREATE OR REPLACE VIEW pix_payments_with_details AS
SELECT 
  pp.id,
  pp.user_id,
  pp.event_id,
  pp.amount,
  pp.pix_id,
  pp.status,
  pp.br_code,
  pp.br_code_base64,
  pp.created_at,
  pp.expires_at,
  pp.paid_at,
  p.nickname,
  p.avatar_url,
  e.name as event_name,
  e.scheduled_date as event_date
FROM pix_payments pp
JOIN profiles p ON p.id = pp.user_id
JOIN events e ON e.id = pp.event_id;

-- =====================================================
-- VIEW: event_entries_with_details
-- View para consultas com dados do evento e usuario
-- =====================================================
CREATE OR REPLACE VIEW event_entries_with_details AS
SELECT 
  ee.id,
  ee.user_id,
  ee.event_id,
  ee.amount,
  ee.pix_payment_id,
  ee.created_at,
  p.nickname,
  p.avatar_url,
  e.name as event_name,
  e.scheduled_date as event_date
FROM event_entries ee
JOIN profiles p ON p.id = ee.user_id
JOIN events e ON e.id = ee.event_id;

