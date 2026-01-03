import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { Users, CreditCard, Calendar, TrendingUp } from 'lucide-react';

async function getStats() {
  const supabase = await createClient();
  
  // Total de usuários
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  // Total de eventos
  const { count: eventsCount } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true });

  // Total de lutas
  const { count: fightsCount } = await supabase
    .from('fights')
    .select('*', { count: 'exact', head: true });

  // Total de picks
  const { count: picksCount } = await supabase
    .from('picks')
    .select('*', { count: 'exact', head: true });

  // Pagamentos pendentes
  const { count: pendingPayments } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // Total arrecadado
  const { data: paymentsData } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'confirmed');

  const totalRevenue = paymentsData?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;

  return {
    usersCount: usersCount || 0,
    eventsCount: eventsCount || 0,
    fightsCount: fightsCount || 0,
    picksCount: picksCount || 0,
    pendingPayments: pendingPayments || 0,
    totalRevenue,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bebas text-white tracking-wide">
          PAINEL ADMINISTRATIVO
        </h1>
        <p className="text-ufc-gray-400">
          Gerencie usuários, pagamentos e eventos do Sigma UFC
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="text-blue-400" size={24} />
            </div>
            <div>
              <p className="text-ufc-gray-400 text-sm">Usuários</p>
              <p className="text-2xl font-bebas text-white">{stats.usersCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <CreditCard className="text-green-400" size={24} />
            </div>
            <div>
              <p className="text-ufc-gray-400 text-sm">Receita Total</p>
              <p className="text-2xl font-bebas text-white">
                R$ {stats.totalRevenue.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Calendar className="text-purple-400" size={24} />
            </div>
            <div>
              <p className="text-ufc-gray-400 text-sm">Eventos</p>
              <p className="text-2xl font-bebas text-white">{stats.eventsCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <TrendingUp className="text-orange-400" size={24} />
            </div>
            <div>
              <p className="text-ufc-gray-400 text-sm">Total de Picks</p>
              <p className="text-2xl font-bebas text-white">{stats.picksCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-oswald text-white mb-4">RESUMO</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-ufc-gray-400">Lutas cadastradas</span>
              <span className="text-white font-medium">{stats.fightsCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ufc-gray-400">Pagamentos pendentes</span>
              <span className="text-yellow-400 font-medium">{stats.pendingPayments}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-ufc-gray-400">Média picks/evento</span>
              <span className="text-white font-medium">
                {stats.eventsCount > 0 
                  ? (stats.picksCount / stats.eventsCount).toFixed(1) 
                  : '0'}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-oswald text-white mb-4">AÇÕES RÁPIDAS</h3>
          <div className="space-y-2">
            <a
              href="/admin/events"
              className="block px-4 py-3 bg-ufc-gray-800 hover:bg-ufc-gray-700 rounded-lg text-white transition-colors"
            >
              🔄 Sincronizar Eventos da API
            </a>
            <a
              href="/admin/payments"
              className="block px-4 py-3 bg-ufc-gray-800 hover:bg-ufc-gray-700 rounded-lg text-white transition-colors"
            >
              💳 Ver Pagamentos Pendentes
            </a>
            <a
              href="/admin/users"
              className="block px-4 py-3 bg-ufc-gray-800 hover:bg-ufc-gray-700 rounded-lg text-white transition-colors"
            >
              👥 Gerenciar Usuários
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
}




