import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getFightsByDate } from '@/lib/mma-api/client';
import { calculatePoints } from '@/lib/utils/scoring';
import type { Fight, Pick } from '@/types';

// Usar service role para operações administrativas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    // Verificar se é admin
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Pegar eventId do body
    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'eventId é obrigatório' }, { status: 400 });
    }

    console.log(`[FETCH-RESULTS] Buscando resultados para evento: ${eventId}`);

    // 1. Buscar evento com suas lutas
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select(`
        id,
        name,
        scheduled_date,
        fights(id, api_id, status, fighter1_name, fighter2_name, event_id)
      `)
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    const eventDate = new Date(event.scheduled_date);
    const day = eventDate.getDate();
    const month = eventDate.getMonth() + 1;
    const year = eventDate.getFullYear();

    console.log(`[FETCH-RESULTS] Buscando resultados para ${event.name} (${day}/${month}/${year})`);

    // 2. Buscar resultados da API MMA
    const apiResults = await getFightsByDate(day, month, year);

    if (!apiResults || apiResults.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Nenhum resultado encontrado na API para esta data',
        event: event.name,
        date: `${day}/${month}/${year}`
      });
    }

    console.log(`[FETCH-RESULTS] Encontrados ${apiResults.length} resultados na API`);

    let fightsUpdated = 0;
    let picksUpdated = 0;
    let fightsAlreadyFinished = 0;
    const updatedFights: string[] = [];

    // 3. Atualizar cada luta
    const fights = event.fights as { id: string; api_id: string; status: string; fighter1_name: string; fighter2_name: string; event_id: string }[];

    for (const fight of fights) {
      // Buscar resultado correspondente na API
      const result = apiResults.find(r => r.customId === fight.api_id);

      if (!result) {
        console.log(`[FETCH-RESULTS] Luta não encontrada na API: ${fight.fighter1_name} vs ${fight.fighter2_name}`);
        continue;
      }

      // Verificar se a luta terminou
      if (result.status?.description !== 'Ended') {
        console.log(`[FETCH-RESULTS] Luta ainda não terminou: ${fight.fighter1_name} vs ${fight.fighter2_name}`);
        continue;
      }

      // Pular se já foi atualizada
      if (fight.status === 'finished') {
        fightsAlreadyFinished++;
        continue;
      }

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
        console.error(`[FETCH-RESULTS] Erro ao atualizar luta ${fight.id}:`, updateError);
        continue;
      }

      fightsUpdated++;
      updatedFights.push(`${fight.fighter1_name} vs ${fight.fighter2_name}`);
      console.log(`[FETCH-RESULTS] Luta atualizada: ${fight.fighter1_name} vs ${fight.fighter2_name}`);

      // 4. Buscar luta completa para calcular pontos
      const { data: fullFight } = await supabaseAdmin
        .from('fights')
        .select('*')
        .eq('id', fight.id)
        .single();

      if (!fullFight) continue;

      // 5. Calcular pontos dos palpites
      const { data: picks } = await supabaseAdmin
        .from('picks')
        .select('*')
        .eq('fight_id', fight.id);

      if (!picks || picks.length === 0) continue;

      for (const pick of picks) {
        const points = calculatePoints(pick as Pick, fullFight as Fight);

        // Atualizar pontos do palpite
        await supabaseAdmin
          .from('picks')
          .update({ points })
          .eq('id', pick.id);

        picksUpdated++;

        // Atualizar ranking do usuário
        await updateUserRanking(pick.user_id, eventId, points, points > 0);
      }
    }

    console.log(`[FETCH-RESULTS] Atualização concluída: ${fightsUpdated} lutas, ${picksUpdated} palpites`);

    return NextResponse.json({
      success: true,
      message: 'Resultados atualizados',
      event: event.name,
      fightsUpdated,
      fightsAlreadyFinished,
      picksUpdated,
      updatedFights,
      totalFights: fights.length,
    });

  } catch (error) {
    console.error('[FETCH-RESULTS] Erro:', error);
    return NextResponse.json({
      error: 'Erro ao buscar resultados',
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
