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
  
  const { data, error } = await supabase
    .from('pix_payments')
    .select(`
      *,
      profiles(nickname),
      events(name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar pagamentos:', error);
  }

  if (!data) return [];

  return data.map((payment) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paymentData = payment as any;
    return {
      id: paymentData.id,
      user_id: paymentData.user_id,
      event_id: paymentData.event_id,
      amount: paymentData.amount,
      status: paymentData.status,
      pix_id: paymentData.pix_id,
      created_at: paymentData.created_at,
      paid_at: paymentData.paid_at,
      nickname: paymentData.profiles?.nickname || 'Usuário',
      event_name: paymentData.events?.name || 'Evento',
    };
  });
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
