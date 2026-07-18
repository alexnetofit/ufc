import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generatePdfFromHtml } from '@/lib/pdf/generate';
import { uploadPdf } from '@/lib/pdf/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_HTML_LENGTH = 2_000_000; // ~2MB de HTML

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Autenticação via secret estático (endpoint chamado por sistemas externos)
    const apiSecret = process.env.PDF_API_SECRET;
    if (!apiSecret) {
      console.error('[PDF] PDF_API_SECRET não configurada');
      return NextResponse.json(
        { success: false, error: 'Endpoint não configurado' },
        { status: 500 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${apiSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Validar body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'JSON inválido no corpo da requisição' },
        { status: 400 }
      );
    }

    const { html, filename } = (body ?? {}) as { html?: unknown; filename?: unknown };

    if (typeof html !== 'string' || html.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Campo "html" é obrigatório e deve ser uma string' },
        { status: 400 }
      );
    }

    if (html.length > MAX_HTML_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Campo "html" excede o tamanho máximo de ${MAX_HTML_LENGTH} caracteres` },
        { status: 400 }
      );
    }

    if (filename !== undefined && typeof filename !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Campo "filename" deve ser uma string' },
        { status: 400 }
      );
    }

    // Gerar PDF a partir do HTML
    const pdfBuffer = await generatePdfFromHtml(html);

    // Upload para o Supabase Storage
    const supabase = getAdminClient();
    const url = await uploadPdf(supabase, pdfBuffer, filename as string | undefined);

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('[PDF] Erro ao gerar PDF:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao gerar o PDF' },
      { status: 500 }
    );
  }
}
