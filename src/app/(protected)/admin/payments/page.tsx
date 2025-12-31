import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { PaymentsTable } from '@/components/admin/PaymentsTable';
import { AddPaymentButton } from '@/components/admin/AddPaymentButton';
import type { PaymentWithProfile } from '@/types';

async function getPayments(): Promise<PaymentWithProfile[]> {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('payments')
    .select(`
      *,
      profile:profiles!payments_user_id_fkey(nickname, avatar_url),
      confirmer:profiles!payments_confirmed_by_fkey(nickname)
    `)
    .order('created_at', { ascending: false });

  if (!data) return [];

  return data.map(payment => ({
    ...payment,
    nickname: payment.profile?.nickname || 'Usuário',
    confirmed_by_nickname: payment.confirmer?.nickname || null,
  }));
}

async function getUsers() {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('profiles')
    .select('id, nickname')
    .order('nickname');

  return data || [];
}

export default async function AdminPaymentsPage() {
  const [payments, users] = await Promise.all([getPayments(), getUsers()]);

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const confirmedPayments = payments.filter(p => p.status === 'confirmed');
  const totalRevenue = confirmedPayments.reduce((acc, p) => acc + Number(p.amount), 0);

  return (
    <div>
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bebas text-white tracking-wide">
            GERENCIAR PAGAMENTOS
          </h1>
          <p className="text-ufc-gray-400">
            {payments.length} pagamentos registrados
          </p>
        </div>
        <AddPaymentButton users={users} />
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


