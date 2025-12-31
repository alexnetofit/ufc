import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { getAbacatePayClient, isAbacatePayConfigured } from '@/lib/abacatepay/client';

// Cliente admin para operações que precisam bypassar RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function POST(request: Request) {
  try {
    // Verificar se AbacatePay está configurada
    if (!isAbacatePayConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Sistema de pagamento não configurado' },
        { status: 500 }
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

    // Se já está PAID ou EXPIRED, retornar status atual
    if (payment.status === 'PAID') {
      return NextResponse.json({
        success: true,
        status: 'PAID',
        paid_at: payment.paid_at,
      });
    }

    // Verificar se expirou localmente (antes de chamar API)
    const now = new Date();
    const expiresAt = new Date(payment.expires_at);
    
    if (now > expiresAt && payment.status === 'PENDING') {
      // Atualizar para EXPIRED usando admin client
      const adminClient = getAdminClient();
      await adminClient
        .from('pix_payments')
        .update({ status: 'EXPIRED' })
        .eq('id', paymentId);

      return NextResponse.json({
        success: true,
        status: 'EXPIRED',
      });
    }

    // Consultar status na AbacatePay
    const abacatePay = getAbacatePayClient();
    const checkResponse = await abacatePay.checkPix(payment.pix_id);

    if (checkResponse.error) {
      console.error('[PIX Check] Erro AbacatePay:', checkResponse.error);
      // Retornar status atual do banco em caso de erro na API
      return NextResponse.json({
        success: true,
        status: payment.status,
      });
    }

    const pixStatus = checkResponse.data.status;
    const adminClient = getAdminClient();

    // Atualizar status se mudou
    if (pixStatus !== payment.status) {
      if (pixStatus === 'PAID') {
        // Atualizar pagamento como PAID
        const paidAt = new Date().toISOString();
        await adminClient
          .from('pix_payments')
          .update({ 
            status: 'PAID',
            paid_at: paidAt,
          })
          .eq('id', paymentId);

        // Criar entrada no evento (idempotente via UNIQUE constraint)
        const { error: entryError } = await adminClient
          .from('event_entries')
          .upsert({
            user_id: user.id,
            event_id: payment.event_id,
            amount: payment.amount,
            pix_payment_id: paymentId,
          }, {
            onConflict: 'user_id,event_id',
          });

        if (entryError) {
          console.error('[PIX Check] Erro ao criar event_entry:', entryError);
          // Não falhar a requisição, o pagamento já foi confirmado
        }

        return NextResponse.json({
          success: true,
          status: 'PAID',
          paid_at: paidAt,
        });

      } else if (pixStatus === 'EXPIRED' || pixStatus === 'CANCELLED') {
        // Atualizar status
        await adminClient
          .from('pix_payments')
          .update({ status: pixStatus })
          .eq('id', paymentId);

        return NextResponse.json({
          success: true,
          status: pixStatus,
        });
      }
    }

    // Status não mudou
    return NextResponse.json({
      success: true,
      status: payment.status,
    });

  } catch (error) {
    console.error('[PIX Check] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

