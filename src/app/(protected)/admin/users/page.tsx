import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { UsersTable } from '@/components/admin/UsersTable';
import type { UserSummary } from '@/types';

async function getUsers(): Promise<UserSummary[]> {
  const supabase = await createClient();
  
  // Buscar dados dos usuários
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (!profiles) return [];

  // Buscar estatísticas do ranking global
  const { data: rankings } = await supabase
    .from('global_ranking')
    .select('*');

  // Buscar pagamentos confirmados
  const { data: payments } = await supabase
    .from('payments')
    .select('user_id, amount')
    .eq('status', 'confirmed');

  // Combinar dados
  return profiles.map(profile => {
    const ranking = rankings?.find(r => r.user_id === profile.id);
    const userPayments = payments?.filter(p => p.user_id === profile.id) || [];
    const totalPaid = userPayments.reduce((acc, p) => acc + Number(p.amount), 0);
    
    return {
      user_id: profile.id,
      nickname: profile.nickname,
      avatar_url: profile.avatar_url,
      is_admin: profile.is_admin || false,
      created_at: profile.created_at,
      total_points: ranking?.total_points || 0,
      total_picks: ranking?.picks_count || 0,
      correct_picks: ranking?.correct_picks || 0,
      accuracy: ranking?.accuracy || 0,
      confirmed_payments: userPayments.length,
      total_paid: totalPaid,
    };
  });
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bebas text-white tracking-wide">
          GERENCIAR USUÁRIOS
        </h1>
        <p className="text-ufc-gray-400">
          {users.length} usuários cadastrados
        </p>
      </div>

      <Card className="p-0 overflow-hidden">
        <UsersTable users={users} />
      </Card>
    </div>
  );
}

