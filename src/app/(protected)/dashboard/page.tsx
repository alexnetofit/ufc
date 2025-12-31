import { createClient } from '@/lib/supabase/server';
import { getNextEventWithFights, getUserStats, getUserEventHistory } from '@/lib/queries/dashboard';
import { EventCard } from '@/components/events/EventCard';
import { Card, CardContent } from '@/components/ui';
import { Calendar, Trophy, Target, TrendingUp, History, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Buscar dados em paralelo
  const [nextEvent, stats, history] = await Promise.all([
    getNextEventWithFights(supabase, user.id),
    getUserStats(supabase, user.id),
    getUserEventHistory(supabase, user.id),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bebas text-4xl text-white tracking-wide">
          DASHBOARD
        </h1>
        <p className="text-ufc-gray-400 mt-1">
          Bem-vindo ao Fantasy MMA! Faça seus palpites e suba no ranking.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-ufc-red/20">
                <Trophy className="text-ufc-red" size={24} />
              </div>
              <div>
                <p className="text-ufc-gray-400 text-sm">Pontos Totais</p>
                <p className="font-bebas text-3xl text-white">{stats.totalPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-ufc-gold/20">
                <Target className="text-ufc-gold" size={24} />
              </div>
              <div>
                <p className="text-ufc-gray-400 text-sm">Palpites</p>
                <p className="font-bebas text-3xl text-white">{stats.totalPicks}</p>
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
                <p className="text-ufc-gray-400 text-sm">Acertos</p>
                <p className="font-bebas text-3xl text-white">{stats.correctPicks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/20">
                <Calendar className="text-blue-500" size={24} />
              </div>
              <div>
                <p className="text-ufc-gray-400 text-sm">Precisão</p>
                <p className="font-bebas text-3xl text-white">{stats.accuracy}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Próximo Evento em Destaque */}
      {nextEvent && (
        <section>
          <h2 className="font-oswald text-xl text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-ufc-red rounded"></span>
            PRÓXIMO EVENTO
          </h2>
          <EventCard event={nextEvent} isHighlight />
        </section>
      )}

      {/* Sem eventos */}
      {!nextEvent && (
        <Card className="py-12 text-center">
          <Calendar className="mx-auto text-ufc-gray-500 mb-4" size={48} />
          <h3 className="font-oswald text-xl text-white mb-2">
            Nenhum evento agendado
          </h3>
          <p className="text-ufc-gray-400 mb-4">
            Aguarde! Novos eventos serão sincronizados automaticamente.
          </p>
        </Card>
      )}

      {/* Histórico de Pontuações */}
      <section>
        <h2 className="font-oswald text-xl text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-6 bg-ufc-gold rounded"></span>
          MEU HISTÓRICO
        </h2>

        {history.length > 0 ? (
          <div className="space-y-3">
            {history.map((item) => (
              <Card key={item.event_id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-ufc-gray-800">
                      <History className="text-ufc-gray-400" size={20} />
                    </div>
                    <div>
                      <h3 className="font-oswald text-white">{item.event_name}</h3>
                      <p className="text-ufc-gray-500 text-sm">
                        {format(new Date(item.event_date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-green-500">
                        <CheckCircle size={14} />
                        <span className="text-sm">{item.correct_picks}/{item.picks_count}</span>
                      </div>
                      <p className="text-ufc-gray-500 text-xs">acertos</p>
                    </div>
                    
                    <div className="text-right min-w-[60px]">
                      <p className="font-bebas text-2xl text-ufc-gold">{item.total_points}</p>
                      <p className="text-ufc-gray-500 text-xs">pontos</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="py-8 text-center">
            <History className="mx-auto text-ufc-gray-500 mb-3" size={32} />
            <p className="text-ufc-gray-400">
              Você ainda não tem histórico de pontuações.
            </p>
            <p className="text-ufc-gray-500 text-sm mt-1">
              Faça palpites em eventos para começar!
            </p>
          </Card>
        )}
      </section>

      {/* Quick Links */}
      <section className="grid md:grid-cols-2 gap-4">
        <Link href="/ranking" prefetch={true}>
          <Card variant="hover" className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-ufc-gold/20">
                <Trophy className="text-ufc-gold" size={32} />
              </div>
              <div>
                <h3 className="font-oswald text-lg text-white">Ver Ranking</h3>
                <p className="text-ufc-gray-400 text-sm">
                  Confira sua posição no ranking global
                </p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/events" prefetch={true}>
          <Card variant="hover" className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-xl bg-ufc-red/20">
                <Calendar className="text-ufc-red" size={32} />
              </div>
              <div>
                <h3 className="font-oswald text-lg text-white">Próximos Eventos</h3>
                <p className="text-ufc-gray-400 text-sm">
                  Veja os eventos e faça seus palpites
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </section>
    </div>
  );
}
