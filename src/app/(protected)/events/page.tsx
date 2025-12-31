import { createClient } from '@/lib/supabase/server';
import { getAllEventsWithCounts } from '@/lib/queries/events';
import { EventCard } from '@/components/events/EventCard';
import { Card } from '@/components/ui';
import { Calendar } from 'lucide-react';

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  // Buscar eventos otimizado
  const events = await getAllEventsWithCounts(supabase, user.id);

  // Separar eventos futuros e passados
  const now = new Date();
  const upcomingEvents = events
    .filter(e => new Date(e.scheduled_date) >= now)
    .sort((a, b) => 
      new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    );
  
  const pastEvents = events.filter(e => new Date(e.scheduled_date) < now);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-bebas text-4xl text-white tracking-wide">
          EVENTOS
        </h1>
        <p className="text-ufc-gray-400 mt-1">
          Todos os eventos do UFC disponíveis para palpites
        </p>
      </div>

      {/* Próximos Eventos */}
      {upcomingEvents.length > 0 && (
        <section>
          <h2 className="font-oswald text-xl text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-ufc-red rounded"></span>
            PRÓXIMOS EVENTOS ({upcomingEvents.length})
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingEvents.map((event, index) => (
              <EventCard 
                key={event.id} 
                event={event} 
                isHighlight={index === 0}
              />
            ))}
          </div>
        </section>
      )}

      {/* Eventos Passados */}
      {pastEvents.length > 0 && (
        <section>
          <h2 className="font-oswald text-xl text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-ufc-gray-600 rounded"></span>
            EVENTOS ANTERIORES ({pastEvents.length})
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastEvents.map((event) => (
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
            Aguarde! Novos eventos serão sincronizados automaticamente toda segunda-feira.
          </p>
        </Card>
      )}
    </div>
  );
}
