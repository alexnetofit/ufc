import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { PaymentsTable } from '@/components/admin/PaymentsTable';

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
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('pix_payments')
    .select(`
      id,
      user_id,
      event_id,
      amount,
      status,
      pix_id,
      created_at,
      paid_at,
      profiles!pix_payments_user_id_fkey(nickname),
      events!pix_payments_event_id_fkey(name)
    `)
    .order('created_at', { ascending: false });

  if (!data) return [];

  return data.map(payment => ({
    id: payment.id,
    user_id: payment.user_id,
    event_id: payment.event_id,
    amount: payment.amount,
    status: payment.status,
    pix_id: payment.pix_id,
    created_at: payment.created_at,
    paid_at: payment.paid_at,
    nickname: (payment.profiles as { nickname: string })?.nickname || 'Usuário',
    event_name: (payment.events as { name: string })?.name || 'Evento',
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
