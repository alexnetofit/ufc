import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { 
      fightId, 
      fighter1_name, 
      fighter2_name, 
      weight_class, 
      fight_type, 
      status, 
      winner_code, 
      win_type, 
      round 
    } = body;

    if (!fightId) {
      return NextResponse.json({ error: 'fightId is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('fights')
      .update({
        fighter1_name,
        fighter2_name,
        weight_class,
        fight_type,
        status,
        winner_code,
        win_type,
        round,
      })
      .eq('id', fightId);

    if (error) throw error;

    // Se a luta foi finalizada, recalcular pontos dos picks
    if (status === 'finished' && winner_code) {
      // Buscar todos os picks desta luta
      const { data: picks } = await supabase
        .from('picks')
        .select('*')
        .eq('fight_id', fightId);

      if (picks && picks.length > 0) {
        // Importar função de pontuação
        const { calculatePoints } = await import('@/lib/utils/scoring');
        
        // Criar objeto de luta parcial para cálculo
        const fightResult = {
          winner_code,
          win_type,
          round,
          status: 'finished' as const,
        };

        for (const pick of picks) {
          const points = calculatePoints(pick, fightResult as never);

          await supabase
            .from('picks')
            .update({ points })
            .eq('id', pick.id);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update fight error:', error);
    return NextResponse.json({ error: 'Failed to update fight' }, { status: 500 });
  }
}

