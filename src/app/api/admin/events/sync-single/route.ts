import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFightsByDate } from '@/lib/mma-api/client';
import { normalizeFight, extractEventName } from '@/lib/mma-api/normalize';
import { syncFighterImage } from '@/lib/supabase/storage';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'eventId é obrigatório' }, { status: 400 });
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, scheduled_date')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    const eventDate = new Date(event.scheduled_date);
    const day = eventDate.getDate();
    const month = eventDate.getMonth() + 1;
    const year = eventDate.getFullYear();

    console.log(`[SYNC-SINGLE] Buscando lutas para ${event.name} (${day}/${month}/${year})`);

    const apiResults = await getFightsByDate(day, month, year);

    if (!apiResults || apiResults.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Nenhuma luta encontrada na API para esta data',
      });
    }

    // Filtrar apenas lutas deste evento (pelo nome do torneio)
    const eventFights = apiResults.filter(r => {
      const name = extractEventName(r);
      return name === event.name;
    });

    console.log(`[SYNC-SINGLE] ${eventFights.length} lutas do evento (${apiResults.length} total na data)`);

    // Se nao encontrar pelo nome exato, usar todas da data
    const fightsToSync = eventFights.length > 0 ? eventFights : apiResults;

    let fightsCreated = 0;
    let fightsUpdated = 0;
    let fightersProcessed = 0;
    const processedFighters = new Set<number>();

    for (const apiFight of fightsToSync) {
      const fight = normalizeFight(apiFight, event.id);

      // Sincronizar fotos dos lutadores
      if (!processedFighters.has(fight.fighter1_id)) {
        try {
          await syncFighterImage(supabase, fight.fighter1_id, fight.fighter1_name);
          fightersProcessed++;
        } catch (e) {
          console.error(`[SYNC-SINGLE] Erro foto fighter ${fight.fighter1_id}:`, e);
        }
        processedFighters.add(fight.fighter1_id);
      }

      if (!processedFighters.has(fight.fighter2_id)) {
        try {
          await syncFighterImage(supabase, fight.fighter2_id, fight.fighter2_name);
          fightersProcessed++;
        } catch (e) {
          console.error(`[SYNC-SINGLE] Erro foto fighter ${fight.fighter2_id}:`, e);
        }
        processedFighters.add(fight.fighter2_id);
      }

      // Verificar se a luta ja existe
      const { data: existingFight } = await supabase
        .from('fights')
        .select('id')
        .eq('api_id', fight.api_id)
        .single();

      if (!existingFight) {
        const { error: fightError } = await supabase
          .from('fights')
          .insert(fight);

        if (!fightError) {
          fightsCreated++;
        } else {
          console.error('[SYNC-SINGLE] Erro ao criar luta:', fightError);
        }
      } else {
        await supabase
          .from('fights')
          .update({
            fighter1_name: fight.fighter1_name,
            fighter2_name: fight.fighter2_name,
            weight_class: fight.weight_class,
            fight_type: fight.fight_type,
            status: fight.status,
            winner_code: fight.winner_code,
            win_type: fight.win_type,
            round: fight.round,
          })
          .eq('api_id', fight.api_id);
        fightsUpdated++;
      }
    }

    console.log(`[SYNC-SINGLE] Concluído: ${fightsCreated} criadas, ${fightsUpdated} atualizadas`);

    return NextResponse.json({
      success: true,
      event: event.name,
      fightsCreated,
      fightsUpdated,
      fightersProcessed,
      totalFromAPI: fightsToSync.length,
    });
  } catch (error) {
    console.error('[SYNC-SINGLE] Erro:', error);
    return NextResponse.json({
      error: 'Erro ao sincronizar evento',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
