import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { Card } from '@/components/ui';
import { PaymentsTable } from '@/components/admin/PaymentsTable';

// Cliente admin para bypassar RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

interface PixPaymentWithDetails {
  id: string;
  user_id: string;
  event_id: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  pix_id: string;
  created_at: string;
  paid_at: string | null;
  nickname: string;
  event_name: string;
}

async function getPixPayments(): Promise<PixPaymentWithDetails[]> {
  const supabase = getAdminClient();
  
  // Buscar pagamentos
  const { data: payments, error: paymentsError } = await supabase
    .from('pix_payments')
    .select('*')
    .order('created_at', { ascending: false });

  if (paymentsError) {
    console.error('Erro ao buscar pagamentos:', paymentsError);
    return [];
  }

  if (!payments || payments.length === 0) return [];

  // Buscar profiles
  const userIds = [...new Set(payments.map(p => p.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname')
    .in('id', userIds);

  // Buscar eventos
  const eventIds = [...new Set(payments.map(p => p.event_id))];
  const { data: events } = await supabase
    .from('events')
    .select('id, name')
    .in('id', eventIds);

  const profilesMap = new Map((profiles || []).map(p => [p.id, p.nickname]));
  const eventsMap = new Map((events || []).map(e => [e.id, e.name]));

  return payments.map((payment) => ({
    id: payment.id,
    user_id: payment.user_id,
    event_id: payment.event_id,
    amount: payment.amount,
    status: payment.status,
    pix_id: payment.pix_id,
    created_at: payment.created_at,
    paid_at: payment.paid_at,
    nickname: profilesMap.get(payment.user_id) || 'Usuário',
    event_name: eventsMap.get(payment.event_id) || 'Evento',
  }));
}

export default async function AdminPaymentsPage() {
  const payments = await getPixPayments();

  const pendingPayments = payments.filter(p => p.status === 'PENDING');
  const confirmedPayments = payments.filter(p => p.status === 'PAID');
  const totalRevenue = confirmedPayments.reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bebas text-white tracking-wide">
            GERENCIAR PAGAMENTOS PIX
          </h1>
          <p className="text-ufc-gray-400">
            {payments.length} pagamentos registrados
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="p-4 text-center">
          <p className="text-ufc-gray-400 text-sm">Pendentes</p>
          <p className="text-2xl font-bebas text-yellow-400">{pendingPayments.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-ufc-gray-400 text-sm">Confirmados</p>
          <p className="text-2xl font-bebas text-green-400">{confirmedPayments.length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-ufc-gray-400 text-sm">Total Arrecadado</p>
          <p className="text-2xl font-bebas text-white">R$ {totalRevenue.toFixed(2)}</p>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <PaymentsTable payments={payments} />
      </Card>
    </div>
  );
}
