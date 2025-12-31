import { SupabaseClient } from '@supabase/supabase-js';

export interface RankingEntry {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  total_points: number;
  picks_count: number;
  correct_picks: number;
  accuracy: number;
}

// Buscar ranking global
export async function getGlobalRanking(supabase: SupabaseClient): Promise<RankingEntry[]> {
  const { data } = await supabase
    .from('global_ranking')
    .select('*')
    .order('total_points', { ascending: false })
    .limit(100);

  return data || [];
}

// Buscar ranking mensal
export async function getMonthlyRanking(
  supabase: SupabaseClient,
  year: number,
  month: number
): Promise<RankingEntry[]> {
  // Calcular início e fim do mês
  const startOfMonth = new Date(year, month - 1, 1).toISOString();
  const endOfMonth = new Date(year, month, 0, 23, 59, 59).toISOString();

  // Buscar rankings com eventos do mês
  const { data: rankings } = await supabase
    .from('rankings')
    .select(`
      user_id,
      total_points,
      picks_count,
      correct_picks,
      events!inner(scheduled_date),
      profiles!inner(nickname, avatar_url)
    `)
    .gte('events.scheduled_date', startOfMonth)
    .lte('events.scheduled_date', endOfMonth);

  if (!rankings || rankings.length === 0) return [];

  // Agrupar por usuário e somar pontos
  const userMap = new Map<string, {
    user_id: string;
    nickname: string;
    avatar_url: string | null;
    total_points: number;
    picks_count: number;
    correct_picks: number;
  }>();

  for (const r of rankings) {
    const existing = userMap.get(r.user_id);
    const profile = r.profiles as { nickname: string; avatar_url: string | null };
    
    if (existing) {
      existing.total_points += r.total_points;
      existing.picks_count += r.picks_count;
      existing.correct_picks += r.correct_picks;
    } else {
      userMap.set(r.user_id, {
        user_id: r.user_id,
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
        total_points: r.total_points,
        picks_count: r.picks_count,
        correct_picks: r.correct_picks,
      });
    }
  }

  // Converter para array, calcular accuracy e ordenar
  const result = Array.from(userMap.values()).map(user => ({
    ...user,
    accuracy: user.picks_count > 0 
      ? Math.round((user.correct_picks / user.picks_count) * 100) 
      : 0,
  }));

  return result.sort((a, b) => b.total_points - a.total_points);
}

// Buscar meses disponíveis com eventos
export async function getAvailableMonths(supabase: SupabaseClient): Promise<{ year: number; month: number }[]> {
  const { data: events } = await supabase
    .from('events')
    .select('scheduled_date')
    .order('scheduled_date', { ascending: false });

  if (!events) return [];

  // Extrair meses únicos
  const monthsSet = new Set<string>();
  const months: { year: number; month: number }[] = [];

  for (const event of events) {
    const date = new Date(event.scheduled_date);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    
    if (!monthsSet.has(key)) {
      monthsSet.add(key);
      months.push({
        year: date.getFullYear(),
        month: date.getMonth() + 1,
      });
    }
  }

  return months.slice(0, 12); // Últimos 12 meses com eventos
}
