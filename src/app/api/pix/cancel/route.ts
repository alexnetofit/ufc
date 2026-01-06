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

    // Validar body
    const body = await request.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'paymentId é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar pagamento no banco (verificar que pertence ao usuário)
    const { data: payment, error: paymentError } = await supabase
      .from('pix_payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', user.id)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { success: false, error: 'Pagamento não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o pagamento está pendente
    if (payment.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Apenas pagamentos pendentes podem ser cancelados' },
        { status: 400 }
      );
    }

    // Cancelar o pagamento usando admin client
    const adminClient = getAdminClient();
    const { error: updateError } = await adminClient
      .from('pix_payments')
      .update({ status: 'CANCELLED' })
      .eq('id', paymentId);

    if (updateError) {
      console.error('[PIX Cancel] Erro ao cancelar:', updateError);
      return NextResponse.json(
        { success: false, error: 'Erro ao cancelar pagamento' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pagamento cancelado com sucesso',
    });

  } catch (error) {
    console.error('[PIX Cancel] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}




