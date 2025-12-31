import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Endpoint manual para sincronização (para admin/testes)
 * POST /api/sync?action=events ou ?action=results
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verificar se é admin (pode adicionar lógica mais robusta depois)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'events') {
      // Chamar o cron de eventos
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/sync-events`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          },
        }
      );
      return NextResponse.json(await response.json());
    }

    if (action === 'results') {
      // Chamar o cron de resultados
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron/update-results`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`,
          },
        }
      );
      return NextResponse.json(await response.json());
    }

    return NextResponse.json({ 
      error: 'Invalid action. Use ?action=events or ?action=results' 
    }, { status: 400 });

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ 
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


