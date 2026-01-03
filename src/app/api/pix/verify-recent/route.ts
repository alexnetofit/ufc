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
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'eventId é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se já tem entrada confirmada
    const { data: existingEntry } = await supabase
      .from('event_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .single();

    if (existingEntry) {
      return NextResponse.json({
        success: true,
        found: true,
        message: 'Você já possui entrada confirmada para este evento',
      });
    }

    // Buscar PIXs recentes do usuário para este evento (últimos 30 minutos)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: recentPayments } = await supabase
      .from('pix_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false });

    if (!recentPayments || recentPayments.length === 0) {
      return NextResponse.json({
        success: true,
        found: false,
        message: 'Nenhum pagamento recente encontrado',
      });
    }

    // Verificar cada pagamento na AbacatePay
    const abacatePay = getAbacatePayClient();
    const adminClient = getAdminClient();

    for (const payment of recentPayments) {
      // Pular se já está PAID no banco
      if (payment.status === 'PAID') {
        // Garantir que event_entry existe
        await adminClient
          .from('event_entries')
          .upsert({
            user_id: user.id,
            event_id: eventId,
            amount: payment.amount,
            pix_payment_id: payment.id,
          }, {
            onConflict: 'user_id,event_id',
          });

        return NextResponse.json({
          success: true,
          found: true,
          payment: payment,
          message: 'Pagamento confirmado!',
        });
      }

      // Verificar na AbacatePay
      try {
        const checkResponse = await abacatePay.checkPix(payment.pix_id);
        
        if (!checkResponse.error && checkResponse.data.status === 'PAID') {
          // Atualizar pagamento como PAID
          const paidAt = new Date().toISOString();
          await adminClient
            .from('pix_payments')
            .update({ 
              status: 'PAID',
              paid_at: paidAt,
            })
            .eq('id', payment.id);

          // Criar entrada no evento
          await adminClient
            .from('event_entries')
            .upsert({
              user_id: user.id,
              event_id: eventId,
              amount: payment.amount,
              pix_payment_id: payment.id,
            }, {
              onConflict: 'user_id,event_id',
            });

          return NextResponse.json({
            success: true,
            found: true,
            payment: { ...payment, status: 'PAID', paid_at: paidAt },
            message: 'Pagamento confirmado!',
          });
        }
      } catch (err) {
        console.error('[Verify Recent] Erro ao verificar PIX:', payment.id, err);
        // Continuar para o próximo pagamento
      }
    }

    // Nenhum pagamento confirmado encontrado
    return NextResponse.json({
      success: true,
      found: false,
      message: 'Nenhum pagamento confirmado encontrado. Se você pagou, aguarde alguns segundos e tente novamente.',
    });

  } catch (error) {
    console.error('[Verify Recent] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

