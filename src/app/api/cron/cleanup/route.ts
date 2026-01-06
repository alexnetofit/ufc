import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteFighterImage } from '@/lib/supabase/storage';

// Usar service role para operações administrativas
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// Manter dados dos últimos 6 meses
const RETENTION_MONTHS = 6;

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

    console.log('[CLEANUP] Iniciando limpeza de dados antigos...');

    // Calcular data limite (6 meses atrás)
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - RETENTION_MONTHS);
    const cutoffDateStr = cutoffDate.toISOString();

    console.log(`[CLEANUP] Removendo dados anteriores a ${cutoffDate.toLocaleDateString()}`);

    let eventsDeleted = 0;
    let fightsDeleted = 0;
    let fightersDeleted = 0;
    let imagesDeleted = 0;

    // 1. Buscar eventos antigos
    const { data: oldEvents } = await supabaseAdmin
      .from('events')
      .select('id, name')
      .lt('scheduled_date', cutoffDateStr);

    if (oldEvents && oldEvents.length > 0) {
      console.log(`[CLEANUP] Encontrados ${oldEvents.length} eventos antigos`);

      for (const event of oldEvents) {
        // Deletar lutas do evento (picks são deletados em cascade)
        const { data: deletedFights } = await supabaseAdmin
          .from('fights')
          .delete()
          .eq('event_id', event.id)
          .select('id');

        fightsDeleted += deletedFights?.length || 0;

        // Deletar rankings do evento
        await supabaseAdmin
          .from('rankings')
          .delete()
          .eq('event_id', event.id);

        // Deletar evento
        await supabaseAdmin
          .from('events')
          .delete()
          .eq('id', event.id);

        eventsDeleted++;
        console.log(`[CLEANUP] Evento deletado: ${event.name}`);
      }
    }

    // 2. Buscar fighters antigos (sem atualização nos últimos 6 meses)
    const { data: oldFighters } = await supabaseAdmin
      .from('fighters')
      .select('id, api_id, name')
      .lt('updated_at', cutoffDateStr);

    if (oldFighters && oldFighters.length > 0) {
      console.log(`[CLEANUP] Encontrados ${oldFighters.length} lutadores antigos`);

      for (const fighter of oldFighters) {
        // Deletar imagem do Storage
        const deleted = await deleteFighterImage(supabaseAdmin, fighter.api_id);
        if (deleted) {
          imagesDeleted++;
        }

        // Deletar registro do fighter
        await supabaseAdmin
          .from('fighters')
          .delete()
          .eq('id', fighter.id);

        fightersDeleted++;
        console.log(`[CLEANUP] Fighter deletado: ${fighter.name}`);
      }
    }

    console.log(`[CLEANUP] Concluído: ${eventsDeleted} eventos, ${fightsDeleted} lutas, ${fightersDeleted} lutadores, ${imagesDeleted} imagens`);

    return NextResponse.json({
      success: true,
      message: 'Limpeza concluída',
      eventsDeleted,
      fightsDeleted,
      fightersDeleted,
      imagesDeleted,
      cutoffDate: cutoffDateStr,
    });

  } catch (error) {
    console.error('[CLEANUP] Erro:', error);
    return NextResponse.json({ 
      error: 'Erro na limpeza',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}







