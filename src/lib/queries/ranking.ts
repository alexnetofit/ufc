import { SupabaseClient } from '@supabase/supabase-js';

// Buscar ranking global
export async function getGlobalRanking(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('global_ranking')
    .select('*')
    .order('total_points', { ascending: false })
    .limit(100);

  return data || [];
}
