import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardContent, Badge } from '@/components/ui';
import { UserPicksHistory } from '@/components/admin/UserPicksHistory';
import { 
  ArrowLeft, User, Mail, Calendar, Trophy, Target, 
  TrendingUp, Shield, CreditCard, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PageProps {
  params: Promise<{ userId: string }>;
}

async function getUserDetails(userId: string) {
  const supabase = await createClient();

  // Buscar profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  // Buscar estatísticas do ranking global
  const { data: globalRanking } = await supabase
    .from('global_ranking')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Buscar rankings por evento
  const { data: eventRankings } = await supabase
    .from('rankings')
    .select(`
      *,
      events(id, name, scheduled_date)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Buscar pagamentos
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  // Buscar picks com detalhes das lutas
  const { data: picks } = await supabase
    .from('picks')
    .select(`
      *,
      fights(
        id,
        fighter1_name,
        fighter2_name,
        winner_code,
        status,
        event_id,
        events(id, name, scheduled_date)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return {
    profile,
    globalRanking,
    eventRankings: eventRankings || [],
    payments: payments || [],
    picks: picks || [],
  };
}

export default async function AdminUserDetailsPage({ params }: PageProps) {
  const { userId } = await params;
  const data = await getUserDetails(userId);

  if (!data) {
    notFound();
  }

  const { profile, globalRanking, eventRankings, payments, picks } = data;

  const totalPaid = payments
    .filter(p => p.status === 'confirmed')
    .reduce((acc, p) => acc + Number(p.amount), 0);

  const accuracy = globalRanking?.picks_count > 0
    ? Math.round((globalRanking.correct_picks / globalRanking.picks_count) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/admin/users"
          className="p-2 rounded-lg bg-ufc-gray-800 hover:bg-ufc-gray-700 transition-colors"
        >
          <ArrowLeft size={20} className="text-ufc-gray-400" />
        </Link>
        <div>
          <h1 className="font-bebas text-3xl text-white tracking-wide">
            DETALHES DO USUÁRIO
          </h1>
          <p className="text-ufc-gray-400">
            Visualizar informações completas do usuário
          </p>
        </div>
      </div>

      {/* Profile Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-ufc-gray-700 flex items-center justify-center border-4 border-ufc-gray-600 overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.nickname}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="text-ufc-gray-400" size={40} />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="font-oswald text-2xl text-white">{profile.nickname}</h2>
                {profile.is_admin && (
                  <Badge variant="error">
                    <Shield size={12} className="mr-1" />
                    Admin
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-ufc-gray-400">
                  <Mail size={16} />
                  <span>ID: {profile.id.slice(0, 8)}...</span>
                </div>
                <div className="flex items-center gap-2 text-ufc-gray-400">
                  <Calendar size={16} />
                  <span>Membro desde {format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-ufc-gold/20">
                <Trophy className="text-ufc-gold" size={24} />
              </div>
              <div>
                <p className="text-ufc-gray-400 text-sm">Pontos Totais</p>
                <p className="font-bebas text-3xl text-white">{globalRanking?.total_points || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-ufc-red/20">
                <Target className="text-ufc-red" size={24} />
              </div>
              <div>
                <p className="text-ufc-gray-400 text-sm">Palpites</p>
                <p className="font-bebas text-3xl text-white">{globalRanking?.picks_count || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/20">
                <TrendingUp className="text-green-500" size={24} />
              </div>
              <div>
                <p className="text-ufc-gray-400 text-sm">Precisão</p>
                <p className="font-bebas text-3xl text-white">{accuracy}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/20">
                <CreditCard className="text-blue-500" size={24} />
              </div>
              <div>
                <p className="text-ufc-gray-400 text-sm">Total Pago</p>
                <p className="font-bebas text-3xl text-white">R$ {totalPaid.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pontuação por Evento */}
      <Card>
        <CardHeader>
          <h2 className="font-oswald text-xl text-white flex items-center gap-2">
            <Trophy size={20} className="text-ufc-gold" />
            Pontuação por Evento
          </h2>
        </CardHeader>
        <CardContent>
          {eventRankings.length > 0 ? (
            <div className="space-y-3">
              {eventRankings.map((ranking) => (
                <div 
                  key={ranking.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-ufc-gray-800"
                >
                  <div>
                    <p className="font-medium text-white">
                      {(ranking.events as { name: string })?.name || 'Evento'}
                    </p>
                    <p className="text-ufc-gray-500 text-sm">
                      {ranking.events && format(
                        new Date((ranking.events as { scheduled_date: string }).scheduled_date), 
                        "dd/MM/yyyy", 
                        { locale: ptBR }
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bebas text-2xl text-ufc-gold">{ranking.total_points} pts</p>
                    <p className="text-ufc-gray-500 text-sm">
                      {ranking.correct_picks}/{ranking.picks_count} acertos
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-ufc-gray-500">
              <Trophy size={32} className="mx-auto mb-2 opacity-50" />
              <p>Nenhuma pontuação registrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Picks */}
      <Card>
        <CardHeader>
          <h2 className="font-oswald text-xl text-white flex items-center gap-2">
            <Clock size={20} className="text-ufc-gray-400" />
            Histórico de Palpites
          </h2>
        </CardHeader>
        <CardContent>
          <UserPicksHistory picks={picks} />
        </CardContent>
      </Card>

      {/* Pagamentos */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-oswald text-xl text-white flex items-center gap-2">
              <CreditCard size={20} className="text-green-500" />
              Histórico de Pagamentos
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payments.map((payment) => (
                <div 
                  key={payment.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-ufc-gray-800"
                >
                  <div>
                    <p className="font-medium text-white">
                      R$ {Number(payment.amount).toFixed(2)}
                    </p>
                    <p className="text-ufc-gray-500 text-sm">
                      {format(new Date(payment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <Badge 
                    variant={
                      payment.status === 'confirmed' ? 'success' :
                      payment.status === 'pending' ? 'warning' :
                      payment.status === 'cancelled' ? 'error' : 'default'
                    }
                  >
                    {payment.status === 'confirmed' ? 'Confirmado' :
                     payment.status === 'pending' ? 'Pendente' :
                     payment.status === 'cancelled' ? 'Cancelado' : payment.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

