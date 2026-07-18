import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generatePdfFromHtml } from '@/lib/pdf/generate';
import { uploadPdf } from '@/lib/pdf/storage';
import { renderPlanoAlimentarHtml } from '@/lib/pdf/plano-alimentar-template';
import { PlanoAlimentarData } from '@/lib/pdf/plano-alimentar-types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BODY_LENGTH = 2_000_000; // ~2MB

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Remove um bloco de código markdown (```html ... ``` ou ``` ... ```) que
// eventualmente envolva o payload, mesmo quando a IA é instruída a não usar markdown.
function stripMarkdownCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json|html)?\s*\n?([\s\S]*?)\n?```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

const BASE64_ONLY_REGEX = /^[A-Za-z0-9+/=\s]+$/;

// Ferramentas low-code (ex: Leona) costumam remover `<`, `>` e `"` do texto de
// uma IA antes de repassá-lo (proteção contra HTML/JS em mensagens de chat).
// Para sobreviver a isso, o payload (JSON ou HTML) pode chegar em Base64, que
// só usa caracteres inofensivos (A-Z a-z 0-9 + / =).
function decodeIfBase64(text: string): string {
  if (text.includes('<') || text.trimStart().startsWith('{') || text.trimStart().startsWith('[')) {
    return text;
  }

  if (!BASE64_ONLY_REGEX.test(text) || text.trim().length < 20) {
    return text;
  }

  try {
    const decoded = Buffer.from(text, 'base64').toString('utf-8');
    return decoded.length > 0 ? decoded : text;
  } catch {
    return text;
  }
}

interface ExtractedPayload {
  html: string;
  filename: string | undefined;
}

function extractPayload(rawBody: string, queryFilename: string | undefined): ExtractedPayload {
  const candidate = stripMarkdownCodeFence(decodeIfBase64(rawBody));

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    // Não é JSON — segue como HTML cru
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;

    if (typeof obj.html === 'string') {
      const filename = typeof obj.filename === 'string' ? obj.filename : queryFilename;
      return { html: obj.html, filename };
    }

    // Dados estruturados do plano alimentar — o HTML é montado por nós, não pela IA
    const data = obj as PlanoAlimentarData;
    const filename =
      (typeof data.filename === 'string' && data.filename) ||
      (typeof data.nome === 'string' && data.nome) ||
      queryFilename;
    return { html: renderPlanoAlimentarHtml(data), filename };
  }

  return { html: candidate, filename: queryFilename };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!rawBody || rawBody.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Corpo da requisição vazio' },
        { status: 400 }
      );
    }

    if (rawBody.length > MAX_BODY_LENGTH) {
      return NextResponse.json(
        { success: false, error: `O corpo da requisição excede o tamanho máximo de ${MAX_BODY_LENGTH} caracteres` },
        { status: 400 }
      );
    }

    const queryFilename = request.nextUrl.searchParams.get('filename') ?? undefined;
    const { html, filename } = extractPayload(rawBody, queryFilename);

    if (html.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nenhum HTML/dado encontrado no corpo da requisição' },
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
