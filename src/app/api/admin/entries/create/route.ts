import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// Cliente admin para operações que precisam bypassar RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function POST(request: Request) {
  try {
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

    // Verificar se é admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Acesso negado. Apenas administradores.' },
        { status: 403 }
      );
    }

    // Validar body
    const body = await request.json();
    const { userId, eventId } = body;

    if (!userId || !eventId) {
      return NextResponse.json(
        { success: false, error: 'userId e eventId são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se usuário existe
    const adminClient = getAdminClient();
    const { data: targetUser, error: userError } = await adminClient
      .from('profiles')
      .select('id, nickname')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json(
        { success: false, error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se evento existe
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id, name')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Evento não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se já existe entrada
    const { data: existingEntry } = await adminClient
      .from('event_entries')
      .select('id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single();

    if (existingEntry) {
      return NextResponse.json(
        { success: false, error: 'Usuário já possui entrada para este evento' },
        { status: 400 }
      );
    }

    // Criar entrada manual (amount = 0, sem pix_payment_id)
    const { error: insertError } = await adminClient
      .from('event_entries')
      .insert({
        user_id: userId,
        event_id: eventId,
        amount: 0,
        pix_payment_id: null,
      });

    if (insertError) {
      console.error('[Admin Entry] Erro ao criar entrada:', insertError);
      return NextResponse.json(
        { success: false, error: 'Erro ao criar entrada' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Entrada liberada para ${targetUser.nickname} no evento ${event.name}`,
    });

  } catch (error) {
    console.error('[Admin Entry] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

