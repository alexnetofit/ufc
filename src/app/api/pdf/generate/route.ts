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

// Remove um bloco de código markdown (```html ... ``` ou ``` ... ```) que
// eventualmente envolva o HTML gerado por uma IA, mesmo quando instruída a não usar markdown.
function stripMarkdownCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:html)?\s*\n?([\s\S]*?)\n?```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

// Aceita tanto { html, filename } em JSON quanto o HTML puro direto no corpo da requisição
// (qualquer content-type), já que o consumidor desse endpoint costuma ser a saída de uma IA
// que nem sempre chega perfeitamente encapsulada em JSON.
function extractHtmlAndFilename(
  rawBody: string,
  queryFilename: string | undefined
): { html: string; filename: string | undefined } {
  let html: string | undefined;
  let filename = queryFilename;

  try {
    const parsed = JSON.parse(rawBody);
    if (parsed && typeof parsed === 'object' && typeof (parsed as Record<string, unknown>).html === 'string') {
      html = (parsed as Record<string, unknown>).html as string;
      const parsedFilename = (parsed as Record<string, unknown>).filename;
      if (typeof parsedFilename === 'string') {
        filename = parsedFilename;
      }
    }
  } catch {
    // Corpo não é um JSON válido — tratado como HTML cru abaixo
  }

  if (html === undefined) {
    html = rawBody;
  }

  return { html: stripMarkdownCodeFence(html), filename };
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

    const rawBody = await request.text();
    if (!rawBody || rawBody.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Corpo da requisição vazio' },
        { status: 400 }
      );
    }

    const queryFilename = request.nextUrl.searchParams.get('filename') ?? undefined;
    const { html, filename } = extractHtmlAndFilename(rawBody, queryFilename);

    if (html.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum HTML encontrado no corpo da requisição' },
        { status: 400 }
      );
    }

    if (html.length > MAX_HTML_LENGTH) {
      return NextResponse.json(
        { success: false, error: `O HTML excede o tamanho máximo de ${MAX_HTML_LENGTH} caracteres` },
        { status: 400 }
      );
    }

    // Gerar PDF a partir do HTML
    const pdfBuffer = await generatePdfFromHtml(html);

    // Upload para o Supabase Storage
    const supabase = getAdminClient();
    const url = await uploadPdf(supabase, pdfBuffer, filename);

    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('[PDF] Erro ao gerar PDF:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao gerar o PDF' },
      { status: 500 }
    );
  }
}
