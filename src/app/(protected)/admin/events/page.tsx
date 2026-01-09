import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui';
import { EventsManager } from '@/components/admin/EventsManager';
import type { Event, Fight } from '@/types';

interface EventWithFights extends Event {
  fights: Fight[];
}

async function getEvents(): Promise<EventWithFights[]> {
  const supabase = await createClient();
  
  const { data } = await supabase
    .from('events')
    .select(`
      *,
      fights(*)
    `)
    .order('scheduled_date', { ascending: false });

  return data || [];
}

export default async function AdminEventsPage() {
  const events = await getEvents();

  const upcomingEvents = events.filter(e => new Date(e.scheduled_date) > new Date());
  const pastEvents = events.filter(e => new Date(e.scheduled_date) <= new Date());

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bebas text-white tracking-wide">
          GERENCIAR EVENTOS
        </h1>
        <p className="text-ufc-gray-400">
          {events.length} eventos cadastrados ({upcomingEvents.length} próximos)
        </p>
      </div>

      <EventsManager 
        events={events}
        upcomingCount={upcomingEvents.length}
        pastCount={pastEvents.length}
      />
    </div>
  );
}








