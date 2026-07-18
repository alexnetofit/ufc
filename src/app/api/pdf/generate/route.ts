import { after, NextRequest, NextResponse } from 'next/server';
import { parsePayload } from '@/lib/pdf/parse-payload';
import { getPdfAdminClient, createJob } from '@/lib/pdf/jobs';
import { processJob } from '@/lib/pdf/process-job';

export const runtime = 'nodejs';
export const maxDuration = 300;

const MAX_BODY_LENGTH = 2_000_000; // ~2MB

/**
 * POST assíncrono: valida o corpo, cria um job, dispara o processamento em
 * background (after) e retorna imediatamente o ID. O integrador então consulta
 * GET /api/pdf/status/{id} a cada ~30s até status = completed.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!rawBody || rawBody.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Corpo da requisição vazio' }, { status: 400 });
    }
    if (rawBody.length > MAX_BODY_LENGTH) {
      return NextResponse.json(
        { success: false, error: `O corpo excede o tamanho máximo de ${MAX_BODY_LENGTH} caracteres` },
        { status: 400 }
      );
    }

    const queryFilename = request.nextUrl.searchParams.get('filename') ?? undefined;
    const payload = parsePayload(rawBody, queryFilename);

    const supabase = getPdfAdminClient();
    const id = await createJob(supabase, payload);

    // Processa em background — a resposta volta na hora com o ID.
    after(async () => {
      await processJob(supabase, id, payload);
    });

    return NextResponse.json({ success: true, id, status: 'pending' }, { status: 202 });
  } catch (error) {
    console.error('[PDF] Erro ao criar job:', error);
    return NextResponse.json({ success: false, error: 'Erro interno ao criar o job' }, { status: 500 });
  }
}
