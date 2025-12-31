import { SupabaseClient } from '@supabase/supabase-js';
import { canEventReceivePicks, getEventOpensAt } from '@/lib/utils/date';

export interface EventWithStatus {
  id: string;
  name: string;
  scheduled_date: string;
  location: string | null;
  created_at: string;
  fights_count: number;
  user_picks_count: number;
  isOpenForPicks: boolean;
  opensAt: Date | null;
}

// Buscar próximos 4 eventos com contagem de lutas e status de abertura
export async function getUpcomingEventsWithCounts(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 4
): Promise<EventWithStatus[]> {
  // Buscar apenas eventos futuros com lutas
  const { data: events } = await supabase
    .from('events')
    .select(`
      *,
      fights(id)
    `)
    .gte('scheduled_date', new Date().toISOString())
    .order('scheduled_date', { ascending: true })
    .limit(limit);

  if (!events) return [];

  // Buscar todos os picks do usuário de uma vez
  const allFightIds = events.flatMap(e => e.fights?.map((f: { id: string }) => f.id) || []);
  
  let userPicks: { fight_id: string }[] = [];
  if (allFightIds.length > 0 && userId) {
    const { data } = await supabase
      .from('picks')
      .select('fight_id')
      .eq('user_id', userId)
      .in('fight_id', allFightIds);
    userPicks = data || [];
  }

  return events.map((event, index) => {
    // Primeiro evento: sempre aberto, demais: abrem 1 dia após o anterior
    const previousEventDate = index > 0 ? events[index - 1].scheduled_date : null;
    
    const isOpenForPicks = canEventReceivePicks(event.scheduled_date, previousEventDate);
    const opensAt = previousEventDate ? getEventOpensAt(previousEventDate) : null;

    return {
      id: event.id,
      name: event.name,
      scheduled_date: event.scheduled_date,
      location: event.location,
      created_at: event.created_at,
      fights_count: event.fights?.length || 0,
      user_picks_count: userPicks.filter(p => 
        event.fights?.some((f: { id: string }) => f.id === p.fight_id)
      ).length,
      isOpenForPicks,
      opensAt,
    };
  });
}

// Buscar evento com todas as lutas e status de abertura
export async function getEventWithFights(
  supabase: SupabaseClient,
  eventId: string
) {
  // Buscar o evento específico
  const { data: event } = await supabase
    .from('events')
    .select(`
      *,
      fights(*)
    `)
    .eq('id', eventId)
    .single();

  if (!event) return null;

  // Buscar URLs das fotos dos lutadores
  const fights = event.fights || [];
  const fighterIds = fights.flatMap((f: { fighter1_id: number; fighter2_id: number }) => 
    [f.fighter1_id, f.fighter2_id]
  );

  let fighterImages: Record<number, string | null> = {};
  if (fighterIds.length > 0) {
    const { data: fighters } = await supabase
      .from('fighters')
      .select('api_id, image_url')
      .in('api_id', fighterIds);
    
    if (fighters) {
      fighterImages = fighters.reduce((acc, f) => {
        acc[f.api_id] = f.image_url;
        return acc;
      }, {} as Record<number, string | null>);
    }
  }

  // Adicionar URLs de imagens às lutas
  const fightsWithImages = fights.map((fight: { fighter1_id: number; fighter2_id: number }) => ({
    ...fight,
    fighter1_image_url: fighterImages[fight.fighter1_id] || null,
    fighter2_image_url: fighterImages[fight.fighter2_id] || null,
  }));

  // Buscar evento anterior para calcular se está aberto
  const { data: previousEvents } = await supabase
    .from('events')
    .select('scheduled_date')
    .lt('scheduled_date', event.scheduled_date)
    .order('scheduled_date', { ascending: false })
    .limit(1);

  const previousEventDate = previousEvents?.[0]?.scheduled_date || null;
  const now = new Date();
  
  const isOpenForPicks = new Date(event.scheduled_date) <= now 
    ? false 
    : canEventReceivePicks(event.scheduled_date, previousEventDate);
  
  const opensAt = previousEventDate ? getEventOpensAt(previousEventDate) : null;

  return {
    ...event,
    fights: fightsWithImages,
    isOpenForPicks,
    opensAt,
  };
}

// Buscar evento com lutas e picks do usuário
export async function getEventWithUserPicks(
  supabase: SupabaseClient,
  eventId: string, 
  userId: string
) {
  const event = await getEventWithFights(supabase, eventId);
  
  if (!event) return null;

  // Buscar picks do usuário para este evento
  const fightIds = event.fights?.map((f: { id: string }) => f.id) || [];
  
  let userPicks: Record<string, unknown>[] = [];
  if (fightIds.length > 0) {
    const { data } = await supabase
      .from('picks')
      .select('*')
      .eq('user_id', userId)
      .in('fight_id', fightIds);
    userPicks = data || [];
  }

  // Combinar lutas com picks
  const fightsWithPicks = event.fights?.map((fight: { id: string }) => ({
    ...fight,
    userPick: userPicks.find(p => p.fight_id === fight.id),
  }));

  return {
    ...event,
    fights: fightsWithPicks,
  };
}
