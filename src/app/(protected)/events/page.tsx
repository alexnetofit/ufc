import { createClient } from '@/lib/supabase/server';
import { getUpcomingEventsWithCounts } from '@/lib/queries/events';
import { EventCard } from '@/components/events/EventCard';
import { Card } from '@/components/ui';
import { Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Buscar próximos 4 eventos
  const events = await getUpcomingEventsWithCounts(supabase, user.id, 4);

  const currentEvent = events[0];
  const nextEvents = events.slice(1, 4);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bebas text-4xl text-white tracking-wide">
          EVENTOS
        </h1>
        <p className="text-ufc-gray-400 mt-1">
          Próximos eventos do UFC disponíveis para palpites
        </p>
      </div>

      {/* Evento Atual em Destaque */}
      {currentEvent && (
        <section>
          <h2 className="font-oswald text-xl text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-ufc-red rounded"></span>
            EVENTO ATUAL
          </h2>
          <EventCard event={currentEvent} isHighlight />
        </section>
      )}

      {/* Próximos 3 Eventos */}
      {nextEvents.length > 0 && (
        <section>
          <h2 className="font-oswald text-xl text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-ufc-gray-600 rounded"></span>
            PRÓXIMOS EVENTOS
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {nextEvents.map((event) => (
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
            Nenhum evento encontrado
          </h3>
          <p className="text-ufc-gray-400">
            Aguarde! Novos eventos serão sincronizados automaticamente.
          </p>
        </Card>
      )}
    </div>
  );
}
