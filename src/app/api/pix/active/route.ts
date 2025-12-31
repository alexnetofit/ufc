import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'eventId é obrigatório' },
        { status: 400 }
      );
    }

    // Criar cliente Supabase autenticado
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignorar erros de cookies em Server Components
            }
          },
        },
      }
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verificar se usuário já tem entrada paga para este evento
    const { data: existingEntry } = await supabase
      .from('event_entries')
      .select('id, amount, created_at')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .single();

    if (existingEntry) {
      return NextResponse.json({
        success: true,
        payment: null,
        hasEntry: true,
        entry: existingEntry,
      });
    }

    // Buscar pagamento PENDING não expirado mais recente
    const now = new Date().toISOString();
    const { data: pendingPayment } = await supabase
      .from('pix_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .eq('status', 'PENDING')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      success: true,
      payment: pendingPayment || null,
      hasEntry: false,
    });

  } catch (error) {
    console.error('[PIX Active] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

