import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNextEvents, getFightsByDate } from '@/lib/mma-api/client';
import { normalizeEvent, normalizeFights, groupFightsByEvent, extractEventDate } from '@/lib/mma-api/normalize';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Verificar se o usuário atual é admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!currentProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Buscar próximos eventos da API (apenas para pegar as datas)
    const mainEvents = await getNextEvents(0);
    
    if (!mainEvents || mainEvents.length === 0) {
      return NextResponse.json({ 
        message: 'Nenhum evento encontrado na API',
        eventsCreated: 0,
        fightsCreated: 0,
      });
    }

    // 2. Extrair datas únicas dos eventos
    const eventDates = new Set<string>();
    for (const event of mainEvents) {
      const date = extractEventDate(event);
      const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      eventDates.add(dateKey);
    }

    console.log(`[SYNC] Encontradas ${eventDates.size} datas de eventos`);

    // 3. Para cada data, buscar TODAS as lutas
    let allFights: Awaited<ReturnType<typeof getFightsByDate>> = [];
    
    for (const dateKey of eventDates) {
      const [year, month, day] = dateKey.split('-').map(Number);
      console.log(`[SYNC] Buscando lutas para ${day}/${month}/${year}`);
      
      const fights = await getFightsByDate(day, month, year);
      console.log(`[SYNC] Encontradas ${fights.length} lutas para ${day}/${month}/${year}`);
      
      allFights = [...allFights, ...fights];
    }

    if (allFights.length === 0) {
      return NextResponse.json({ 
        message: 'Nenhuma luta encontrada nas datas',
        eventsCreated: 0,
        fightsCreated: 0,
      });
    }

    console.log(`[SYNC] Total de ${allFights.length} lutas encontradas`);

    // 4. Agrupar lutas por evento
    const eventGroups = groupFightsByEvent(allFights);
    
    let eventsCreated = 0;
    let fightsCreated = 0;
    let fightsUpdated = 0;

    for (const [eventName, fights] of eventGroups) {
      // Normalizar dados do evento
      const eventData = normalizeEvent(fights);
      if (!eventData) continue;

      console.log(`[SYNC] Processando evento: ${eventName} (${fights.length} lutas)`);

      // Verificar se o evento já existe
      const { data: existingEvent } = await supabase
        .from('events')
        .select('id')
        .eq('name', eventName)
        .single();

      let eventId: string;

      if (existingEvent) {
        eventId = existingEvent.id;
        console.log(`[SYNC] Evento já existe: ${eventName}`);
      } else {
        // Criar novo evento
        const { data: newEvent, error: eventError } = await supabase
          .from('events')
          .insert(eventData)
          .select()
          .single();

        if (eventError) {
          console.error('[SYNC] Error creating event:', eventError);
          continue;
        }

        eventId = newEvent.id;
        eventsCreated++;
        console.log(`[SYNC] Evento criado: ${eventName}`);
      }

      // Normalizar e inserir/atualizar lutas
      const normalizedFights = normalizeFights(fights, eventId);
      
      for (const fight of normalizedFights) {
        // Verificar se a luta já existe (pelo api_id)
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
            console.error('[SYNC] Error creating fight:', fightError);
          }
        } else {
          // Atualizar luta existente
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
    }

    console.log(`[SYNC] Concluído: ${eventsCreated} eventos criados, ${fightsCreated} lutas criadas, ${fightsUpdated} lutas atualizadas`);

    return NextResponse.json({
      success: true,
      eventsCreated,
      fightsCreated,
      fightsUpdated,
      totalEvents: eventGroups.size,
      totalFights: allFights.length,
    });
  } catch (error) {
    console.error('[SYNC] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to sync events',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
