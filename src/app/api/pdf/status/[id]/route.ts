import { NextRequest, NextResponse } from 'next/server';
import { getPdfAdminClient, getJob } from '@/lib/pdf/jobs';

export const runtime = 'nodejs';

/**
 * GET /api/pdf/status/{id} — consulta o status de um job de geração de PDF.
 * Resposta: { success, id, status, url, error }.
 * status: pending | processing | completed | failed.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID não informado' }, { status: 400 });
    }

    const supabase = getPdfAdminClient();
    const job = await getJob(supabase, id);

    if (!job) {
      return NextResponse.json({ success: false, error: 'Job não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      id: job.id,
      status: job.status,
      url: job.result_url,
      error: job.error_message,
    });
  } catch (error) {
    console.error('[PDF] Erro ao consultar status:', error);
    return NextResponse.json({ success: false, error: 'Erro interno ao consultar status' }, { status: 500 });
  }
}
