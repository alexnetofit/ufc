import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getAbacatePayClient, isAbacatePayConfigured } from '@/lib/abacatepay/client';
import { PAYMENT_PLAN_AMOUNTS, type PaymentPlan } from '@/types';

// Tempo de expiração do PIX em segundos (15 minutos)
const PIX_EXPIRES_IN = 900;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;

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
    const plan = body.plan as PaymentPlan;

    if (!plan || !['5', '10', '20'].includes(plan)) {
      return NextResponse.json(
        { success: false, error: 'Plano inválido. Escolha 5, 10 ou 20.' },
        { status: 400 }
      );
    }

    const amount = PAYMENT_PLAN_AMOUNTS[plan];

    // Verificar se o evento existe
    const { data: event, error: eventError } = await supabase
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

    // Verificar se usuário já tem entrada paga para este evento
    const { data: existingEntry } = await supabase
      .from('event_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .single();

    if (existingEntry) {
      return NextResponse.json(
        { success: false, error: 'Você já possui entrada confirmada para este evento' },
        { status: 400 }
      );
    }

    // Verificar se existe pagamento PENDING não expirado
    const now = new Date().toISOString();
    const { data: existingPayment } = await supabase
      .from('pix_payments')
      .select('*')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .eq('status', 'PENDING')
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingPayment) {
      // Retornar pagamento existente
      return NextResponse.json({
        success: true,
        payment: existingPayment,
      });
    }

    // Buscar profile do usuário para dados do cliente
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, cpf, phone')
      .eq('id', user.id)
      .single();

    // Formatar telefone: (DD) XXXXX-XXXX
    const formatPhone = (phone: string | null): string => {
      if (!phone) return '(12) 99142-6510'; // Fallback
      const numbers = phone.replace(/\D/g, '');
      const clean = numbers.startsWith('55') ? numbers.slice(2) : numbers;
      if (clean.length < 10) return '(12) 99142-6510';
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
    };

    // Formatar CPF: XXX.XXX.XXX-XX
    const formatCpf = (cpf: string | null): string | null => {
      if (!cpf) return null;
      const numbers = cpf.replace(/\D/g, '');
      if (numbers.length !== 11) return null;
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`;
    };

    const formattedCpf = formatCpf(profile?.cpf || null);
    
    // Só incluir customer se tiver CPF válido (obrigatório pela AbacatePay)
    const customerData = formattedCpf ? {
      name: profile?.full_name || 'Cliente',
      cellphone: formatPhone(profile?.phone),
      email: user.email || '',
      taxId: formattedCpf,
    } : undefined;

    // Criar nova cobrança na AbacatePay
    const abacatePay = getAbacatePayClient();
    
    const pixResponse = await abacatePay.createPix({
      amount,
      expiresIn: PIX_EXPIRES_IN,
      description: 'Bolão Walker - Palpites',
      customer: customerData,
      metadata: {
        supabaseUserId: user.id,
        payerEmail: user.email ?? '',
        eventId,
      },
    });

    if (pixResponse.error || !pixResponse.data) {
      console.error('[PIX Create] Erro AbacatePay:', pixResponse.error);
      return NextResponse.json(
        { 
          success: false, 
          error: `Erro ao gerar PIX: ${pixResponse.error || 'Tente novamente.'}`,
        },
        { status: 500 }
      );
    }

    const pixData = pixResponse.data;

    // Salvar no banco de dados
    const { data: newPayment, error: insertError } = await supabase
      .from('pix_payments')
      .insert({
        user_id: user.id,
        event_id: eventId,
        amount: amount,
        pix_id: pixData.id,
        status: 'PENDING',
        br_code: pixData.brCode,
        br_code_base64: pixData.brCodeBase64,
        expires_at: pixData.expiresAt,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[PIX Create] Erro ao salvar pagamento:', insertError);
      return NextResponse.json(
        { success: false, error: 'Erro ao salvar pagamento' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payment: newPayment,
    });

  } catch (error) {
    console.error('[PIX Create] Erro inesperado:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

