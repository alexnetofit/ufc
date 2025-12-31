import { createClient } from '@/lib/supabase/server';
import { getUpcomingEventsWithFights, getUserStats } from '@/lib/queries/dashboard';
import { EventCard } from '@/components/events/EventCard';
import { Card, CardContent } from '@/components/ui';
import { Calendar, Trophy, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Buscar dados em paralelo
  const [events, stats] = await Promise.all([
    getUpcomingEventsWithFights(supabase, user.id),
    getUserStats(supabase, user.id),
  ]);

  const nextEvent = events[0];
  const otherEvents = events.slice(1);

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

      {/* Outros Eventos */}
      {otherEvents.length > 0 && (
        <section>
          <h2 className="font-oswald text-xl text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-ufc-gray-600 rounded"></span>
            PRÓXIMOS EVENTOS
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {/* Sem eventos */}
      {events.length === 0 && (
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
                <h3 className="font-oswald text-lg text-white">Todos os Eventos</h3>
                <p className="text-ufc-gray-400 text-sm">
                  Veja todos os eventos e faça seus palpites
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </section>
    </div>
  );
}
