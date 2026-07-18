import { NextRequest, NextResponse } from 'next/server';
import { getPdfAdminClient } from '@/lib/pdf/jobs';
import { deletePdfFiles } from '@/lib/pdf/storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

const RETENTION_HOURS = 12;

/**
 * Limpeza automática: remove jobs (e seus arquivos no Storage) com mais de 12h.
 * Rodada por cron da Vercel (ver vercel.json).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const isVercelCron = request.headers.get('x-vercel-cron');
      if (!isVercelCron) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const supabase = getPdfAdminClient();
    const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000).toISOString();

    const { data: oldJobs, error: selectError } = await supabase
      .from('pdf_jobs')
      .select('id, file_paths')
      .lt('created_at', cutoff);

    if (selectError) {
      throw new Error(selectError.message);
    }

    if (!oldJobs || oldJobs.length === 0) {
      return NextResponse.json({ success: true, jobsDeleted: 0, filesDeleted: 0 });
    }

    const allPaths = oldJobs.flatMap((j) => (Array.isArray(j.file_paths) ? j.file_paths : []));
    if (allPaths.length > 0) {
      await deletePdfFiles(supabase, allPaths).catch((e) => {
        console.error('[CLEANUP-PDF] Erro ao remover arquivos:', e?.message ?? e);
      });
    }

    const ids = oldJobs.map((j) => j.id);
    const { error: deleteError } = await supabase.from('pdf_jobs').delete().in('id', ids);
    if (deleteError) {
      throw new Error(deleteError.message);
    }

    console.log(`[CLEANUP-PDF] ${ids.length} jobs e ${allPaths.length} arquivos removidos.`);
    return NextResponse.json({ success: true, jobsDeleted: ids.length, filesDeleted: allPaths.length });
  } catch (error) {
    console.error('[CLEANUP-PDF] Erro:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
