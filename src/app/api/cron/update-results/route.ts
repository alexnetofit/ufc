import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getFightsByDate } from '@/lib/mma-api/client';
import { calculatePoints } from '@/lib/utils/scoring';
import { shouldFetchResults } from '@/lib/utils/date';
import type { Fight, Pick } from '@/types';

// Usar service role para operações administrativas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(request: NextRequest) {
  try {
    // Verificar autorização
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const isVercelCron = request.headers.get('x-vercel-cron');
      if (!isVercelCron) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('[CRON] Verificando se há eventos em andamento...');

    // 1. Buscar eventos com lutas não finalizadas
    const { data: events } = await supabaseAdmin
      .from('events')
      .select(`
        id,
        name,
        scheduled_date,
        fights!inner(id, status, scheduled_for)
      `)
      .eq('fights.status', 'scheduled')
      .order('scheduled_date', { ascending: true });

    if (!events || events.length === 0) {
      console.log('[CRON] Nenhum evento com lutas pendentes');
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhum evento com lutas pendentes',
        skipped: true
      });
    }

    // 2. Verificar quais eventos estão "ao vivo" (acontecendo agora)
    const liveEvents = events.filter(event => {
      // Pegar a primeira luta do evento como horário de início
      const fights = event.fights as { id: string; status: string; scheduled_for: string }[];
      const firstFightTime = fights
        .map(f => new Date(f.scheduled_for).getTime())
        .sort((a, b) => a - b)[0];
      
      if (!firstFightTime) return false;
      
      return shouldFetchResults(new Date(firstFightTime));
    });

    if (liveEvents.length === 0) {
      console.log('[CRON] Nenhum evento em andamento - skip');
      return NextResponse.json({ 
        success: true, 
        message: 'Nenhum evento em andamento',
        skipped: true,
        nextEvents: events.slice(0, 3).map(e => ({
          name: e.name,
          date: e.scheduled_date
        }))
      });
    }

    console.log(`[CRON] ${liveEvents.length} evento(s) em andamento:`, 
      liveEvents.map(e => e.name).join(', ')
    );

    let fightsUpdated = 0;
    let picksUpdated = 0;

    // 3. Para cada evento ao vivo, buscar resultados
    for (const event of liveEvents) {
      const eventDate = new Date(event.scheduled_date);
      const day = eventDate.getDate();
      const month = eventDate.getMonth() + 1;
      const year = eventDate.getFullYear();

      console.log(`[CRON] Buscando resultados para ${event.name} (${day}/${month}/${year})`);

      // Buscar resultados da API
      const apiResults = await getFightsByDate(day, month, year);
      
      if (!apiResults || apiResults.length === 0) {
        console.log(`[CRON] Nenhum resultado encontrado para ${event.name}`);
        continue;
      }

      console.log(`[CRON] Encontrados ${apiResults.length} resultados na API`);

      // 4. Atualizar cada luta
      for (const result of apiResults) {
        // Verificar se a luta terminou
        if (result.status?.description !== 'Ended') continue;

        // Buscar luta no banco
        const { data: fight } = await supabaseAdmin
          .from('fights')
          .select('*, event:events(id)')
          .eq('api_id', result.customId)
          .single();

        if (!fight) {
          console.log(`[CRON] Luta não encontrada: ${result.customId}`);
          continue;
        }

        // Pular se já foi atualizada
        if (fight.status === 'finished') continue;

        // Atualizar resultado da luta
        const updateData = {
          status: 'finished' as const,
          winner_code: result.winnerCode || null,
          win_type: result.winType?.toUpperCase() || null,
          round: result.round?.round || null,
        };

        const { error: updateError } = await supabaseAdmin
          .from('fights')
          .update(updateData)
          .eq('id', fight.id);

        if (updateError) {
          console.error(`[CRON] Erro ao atualizar luta ${fight.id}:`, updateError);
          continue;
        }

        fightsUpdated++;
        console.log(`[CRON] Luta atualizada: ${fight.fighter1_name} vs ${fight.fighter2_name}`);

        // 5. Calcular pontos dos palpites
        const { data: picks } = await supabaseAdmin
          .from('picks')
          .select('*')
          .eq('fight_id', fight.id);

        if (!picks) continue;

        const updatedFight: Fight = {
          ...fight,
          ...updateData,
        };

        for (const pick of picks) {
          const points = calculatePoints(pick as Pick, updatedFight);
          
          // Atualizar pontos do palpite
          await supabaseAdmin
            .from('picks')
            .update({ points })
            .eq('id', pick.id);

          picksUpdated++;

          // Atualizar ranking do usuário
          await updateUserRanking(pick.user_id, fight.event.id, points, points > 0);
        }
      }
    }

    console.log(`[CRON] Atualização concluída: ${fightsUpdated} lutas, ${picksUpdated} palpites`);

    return NextResponse.json({
      success: true,
      message: 'Resultados atualizados',
      eventsProcessed: liveEvents.map(e => e.name),
      fightsUpdated,
      picksUpdated,
    });

  } catch (error) {
    console.error('[CRON] Erro na atualização:', error);
    return NextResponse.json({ 
      error: 'Erro na atualização',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function updateUserRanking(
  userId: string, 
  eventId: string, 
  points: number,
  isCorrect: boolean
) {
  // Verificar se já existe ranking para este usuário/evento
  const { data: existingRanking } = await supabaseAdmin
    .from('rankings')
    .select('*')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .single();

  if (existingRanking) {
    // Atualizar ranking existente
    await supabaseAdmin
      .from('rankings')
      .update({
        total_points: existingRanking.total_points + points,
        picks_count: existingRanking.picks_count + 1,
        correct_picks: existingRanking.correct_picks + (isCorrect ? 1 : 0),
      })
      .eq('id', existingRanking.id);
  } else {
    // Criar novo ranking
    await supabaseAdmin
      .from('rankings')
      .insert({
        user_id: userId,
        event_id: eventId,
        total_points: points,
        picks_count: 1,
        correct_picks: isCorrect ? 1 : 0,
      });
  }
}
