import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PlanoAlimentarData } from './plano-alimentar-types';

export type PdfJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PdfJob {
  id: string;
  status: PdfJobStatus;
  result_url: string | null;
  error_message: string | null;
  file_paths: string[];
  payload: PlanoAlimentarData | null;
  created_at: string;
  updated_at: string;
}

export function getPdfAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function createJob(
  supabase: SupabaseClient,
  payload: PlanoAlimentarData
): Promise<string> {
  const { data, error } = await supabase
    .from('pdf_jobs')
    .insert({ status: 'pending', payload })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Erro ao criar job: ${error?.message ?? 'sem retorno'}`);
  }
  return data.id as string;
}

export async function getJob(
  supabase: SupabaseClient,
  id: string
): Promise<PdfJob | null> {
  const { data, error } = await supabase
    .from('pdf_jobs')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as PdfJob;
}

export async function updateJob(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Pick<PdfJob, 'status' | 'result_url' | 'error_message' | 'file_paths'>>
): Promise<void> {
  const { error } = await supabase
    .from('pdf_jobs')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error(`[PDF][job ${id}] Erro ao atualizar job:`, error.message);
  }
}
