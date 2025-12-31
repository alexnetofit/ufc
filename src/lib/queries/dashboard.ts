import { SupabaseClient } from '@supabase/supabase-js';
import { canEventReceivePicks, getEventOpensAt } from '@/lib/utils/date';

export interface DashboardEvent {
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

export interface UserEventHistoryItem {
  event_id: string;
  event_name: string;
  event_date: string;
  total_points: number;
  picks_count: number;
  correct_picks: number;
}

// Buscar próximo evento com contagem de lutas (apenas 1)
export async function getNextEventWithFights(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardEvent | null> {
  // Buscar apenas o próximo evento
  const { data: events } = await supabase
    .from('events')
    .select(`
      *,
      fights(id)
    `)
    .gte('scheduled_date', new Date().toISOString())
    .order('scheduled_date', { ascending: true })
    .limit(1);

  if (!events || events.length === 0) return null;

  const event = events[0];

  // Buscar picks do usuário para este evento
  const fightIds = event.fights?.map((f: { id: string }) => f.id) || [];
  
  let userPicksCount = 0;
  if (fightIds.length > 0) {
    const { count } = await supabase
      .from('picks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('fight_id', fightIds);
    userPicksCount = count || 0;
  }

  // Primeiro evento futuro: sempre aberto
  const isOpenForPicks = canEventReceivePicks(event.scheduled_date, null);

  return {
    id: event.id,
    name: event.name,
    scheduled_date: event.scheduled_date,
    location: event.location,
    created_at: event.created_at,
    fights_count: event.fights?.length || 0,
    user_picks_count: userPicksCount,
    isOpenForPicks,
    opensAt: null,
  };
}

// Buscar histórico de pontuações do usuário por evento
export async function getUserEventHistory(
  supabase: SupabaseClient,
  userId: string
): Promise<UserEventHistoryItem[]> {
  const { data } = await supabase
    .from('rankings')
    .select(`
      event_id,
      total_points,
      picks_count,
      correct_picks,
      events!inner(id, name, scheduled_date)
    `)
    .eq('user_id', userId)
    .order('events(scheduled_date)', { ascending: false });

  if (!data) return [];

  return data.map((r) => {
    // events pode vir como objeto ou array dependendo da query
    const eventData = r.events;
    const event = Array.isArray(eventData) ? eventData[0] : eventData;
    
    return {
      event_id: r.event_id,
      event_name: event?.name || 'Evento',
      event_date: event?.scheduled_date || '',
      total_points: r.total_points,
      picks_count: r.picks_count,
      correct_picks: r.correct_picks,
    };
  });
}

// Buscar estatísticas do usuário
export async function getUserStats(supabase: SupabaseClient, userId: string) {
  const { data: userStats } = await supabase
    .from('rankings')
    .select('total_points, picks_count, correct_picks')
    .eq('user_id', userId);

  const totalPoints = userStats?.reduce((acc, r) => acc + r.total_points, 0) || 0;
  const totalPicks = userStats?.reduce((acc, r) => acc + r.picks_count, 0) || 0;
  const correctPicks = userStats?.reduce((acc, r) => acc + r.correct_picks, 0) || 0;
  const accuracy = totalPicks > 0 ? Math.round((correctPicks / totalPicks) * 100) : 0;

  return {
    totalPoints,
    totalPicks,
    correctPicks,
    accuracy,
  };
}
