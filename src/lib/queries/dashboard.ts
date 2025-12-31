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

// Buscar eventos futuros com contagem de lutas
export async function getUpcomingEventsWithFights(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardEvent[]> {
  // Buscar eventos com suas lutas
  const { data: events } = await supabase
    .from('events')
    .select(`
      *,
      fights(id)
    `)
    .gte('scheduled_date', new Date().toISOString())
    .order('scheduled_date', { ascending: true })
    .limit(5);

  if (!events) return [];

  // Buscar todos os picks do usuário de uma vez
  const allFightIds = events.flatMap(e => e.fights?.map((f: { id: string }) => f.id) || []);
  
  let userPicks: { fight_id: string }[] = [];
  if (allFightIds.length > 0) {
    const { data } = await supabase
      .from('picks')
      .select('fight_id')
      .eq('user_id', userId)
      .in('fight_id', allFightIds);
    userPicks = data || [];
  }

  // Combinar dados com status de abertura
  return events.map((event, index) => {
    // Primeiro evento futuro: sempre aberto
    // Demais: abrem 1 dia após o anterior
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
