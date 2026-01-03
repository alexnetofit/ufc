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

    const adminClient = getAdminClient();

    // Buscar a entrada
    const { data: entry, error: entryError } = await adminClient
      .from('event_entries')
      .select('id, amount, pix_payment_id')
      .eq('user_id', userId)
      .eq('event_id', eventId)
      .single();

    if (entryError || !entry) {
      return NextResponse.json(
        { success: false, error: 'Entrada não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se é uma entrada manual (amount = 0 e sem pix_payment_id)
    if (entry.amount > 0 || entry.pix_payment_id) {
      return NextResponse.json(
        { success: false, error: 'Apenas entradas liberadas manualmente podem ser revogadas. Entradas pagas via PIX não podem ser removidas.' },
        { status: 400 }
      );
    }

    // Remover a entrada
    const { error: deleteError } = await adminClient
      .from('event_entries')
      .delete()
      .eq('id', entry.id);

    if (deleteError) {
      console.error('[Admin Entry Delete] Erro ao remover entrada:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Erro ao remover entrada' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Entrada revogada com sucesso',
    });

  } catch (error) {
    console.error('[Admin Entry Delete] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

