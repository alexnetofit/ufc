import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getNextEvents, getFightsByDate } from '@/lib/mma-api/client';
import { normalizeEvent, normalizeFights, groupFightsByEvent, extractEventDate } from '@/lib/mma-api/normalize';
import { syncFighterImage } from '@/lib/supabase/storage';

// Usar service role para operações administrativas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    // Verificar secret do cron (segurança)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Em produção, verificar o secret
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const isVercelCron = request.headers.get('x-vercel-cron');
      if (!isVercelCron) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('[CRON] Iniciando sincronização de eventos...');

    // 1. Buscar próximos eventos da API (para pegar as datas)
    const mainEvents = await getNextEvents(0);
    
    if (!mainEvents || mainEvents.length === 0) {
      console.log('[CRON] Nenhum evento encontrado na API');
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhum evento encontrado',
        eventsCreated: 0,
        fightsCreated: 0
      });
    }

    console.log(`[CRON] Encontrados ${mainEvents.length} main events`);

    // 2. Extrair datas únicas dos eventos
    const eventDates = new Set<string>();
    for (const event of mainEvents) {
      const date = extractEventDate(event);
      const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      eventDates.add(dateKey);
    }

    console.log(`[CRON] Encontradas ${eventDates.size} datas de eventos`);

    // 3. Para cada data, buscar TODAS as lutas
    let allFights: Awaited<ReturnType<typeof getFightsByDate>> = [];
    
    for (const dateKey of eventDates) {
      const [year, month, day] = dateKey.split('-').map(Number);
      console.log(`[CRON] Buscando lutas para ${day}/${month}/${year}`);
      
      const fights = await getFightsByDate(day, month, year);
      console.log(`[CRON] Encontradas ${fights.length} lutas`);
      
      allFights = [...allFights, ...fights];
    }

    if (allFights.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'Nenhuma luta encontrada',
        eventsCreated: 0,
        fightsCreated: 0
      });
    }

    console.log(`[CRON] Total de ${allFights.length} lutas encontradas`);

    // 4. Agrupar lutas por evento
    const eventGroups = groupFightsByEvent(allFights);
    
    let eventsCreated = 0;
    let fightsCreated = 0;
    let fightersProcessed = 0;

    // Set para rastrear lutadores já processados neste sync
    const processedFighters = new Set<number>();

    for (const [eventName, fights] of eventGroups) {
      const eventData = normalizeEvent(fights);
      if (!eventData) continue;

      console.log(`[CRON] Processando: ${eventName} (${fights.length} lutas)`);

      // Verificar se evento já existe
      const { data: existingEvent } = await supabaseAdmin
        .from('events')
        .select('id')
        .eq('name', eventName)
        .single();

      let eventId: string;

      if (existingEvent) {
        eventId = existingEvent.id;
      } else {
        const { data: newEvent, error } = await supabaseAdmin
          .from('events')
          .insert({
            name: eventName,
            scheduled_date: eventData.scheduled_date,
            location: eventData.location,
          })
          .select('id')
          .single();

        if (error) {
          console.error(`[CRON] Erro ao criar evento:`, error);
          continue;
        }

        eventId = newEvent.id;
        eventsCreated++;
      }

      // Sincronizar lutas
      const normalizedFights = normalizeFights(fights, eventId);

      for (const fight of normalizedFights) {
        // Sincronizar fotos dos lutadores (apenas se ainda não processado neste sync)
        if (!processedFighters.has(fight.fighter1_id)) {
          await syncFighterImage(supabaseAdmin, fight.fighter1_id, fight.fighter1_name);
          processedFighters.add(fight.fighter1_id);
          fightersProcessed++;
        }
        
        if (!processedFighters.has(fight.fighter2_id)) {
          await syncFighterImage(supabaseAdmin, fight.fighter2_id, fight.fighter2_name);
          processedFighters.add(fight.fighter2_id);
          fightersProcessed++;
        }

        const { data: existingFight } = await supabaseAdmin
          .from('fights')
          .select('id')
          .eq('api_id', fight.api_id)
          .single();

        if (existingFight) {
          await supabaseAdmin
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
            .eq('id', existingFight.id);
        } else {
          const { error } = await supabaseAdmin
            .from('fights')
            .insert(fight);

          if (!error) {
            fightsCreated++;
          }
        }
      }
    }

    console.log(`[CRON] Concluído: ${eventsCreated} eventos, ${fightsCreated} lutas, ${fightersProcessed} lutadores`);

    return NextResponse.json({
      success: true,
      message: 'Sincronização concluída',
      eventsCreated,
      fightsCreated,
      fightersProcessed,
      totalFights: allFights.length,
    });

  } catch (error) {
    console.error('[CRON] Erro:', error);
    return NextResponse.json({ 
      error: 'Erro na sincronização',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
