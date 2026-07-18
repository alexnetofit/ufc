import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export const PDFS_BUCKET = 'pdfs';

// Remove marcas diacriticas (acentos) apos normalizacao NFD, sem depender de
// caracteres unicode literais no source (faixa U+0300-U+036F).
const DIACRITICS_REGEX = new RegExp('[̀-ͯ]', 'g');

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export interface UploadedPdf {
  url: string;
  path: string;
}

/**
 * Faz upload de um PDF para o Supabase Storage e retorna a URL pública e o caminho
 * do arquivo (o caminho é usado depois pela limpeza automática de 12h).
 */
export async function uploadPdfReturningPath(
  supabase: SupabaseClient,
  pdfBuffer: Buffer,
  filenameHint?: string
): Promise<UploadedPdf> {
  const base = filenameHint ? sanitizeFilename(filenameHint) : 'documento';
  const path = `${base}-${randomUUID()}.pdf`;

  const { error } = await supabase.storage
    .from(PDFS_BUCKET)
    .upload(path, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) {
    throw new Error(`Erro ao fazer upload do PDF: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(PDFS_BUCKET)
    .getPublicUrl(path);

  return { url: publicUrl, path };
}

/**
 * Faz upload de um PDF e retorna apenas a URL pública (compatibilidade).
 */
export async function uploadPdf(
  supabase: SupabaseClient,
  pdfBuffer: Buffer,
  filenameHint?: string
): Promise<string> {
  const { url } = await uploadPdfReturningPath(supabase, pdfBuffer, filenameHint);
  return url;
}

/**
 * Remove arquivos do bucket de PDFs pelos seus caminhos. Usado pela limpeza de 12h.
 */
export async function deletePdfFiles(
  supabase: SupabaseClient,
  paths: string[]
): Promise<void> {
  const valid = paths.filter((p) => typeof p === 'string' && p.length > 0);
  if (valid.length === 0) return;

  const { error } = await supabase.storage.from(PDFS_BUCKET).remove(valid);
  if (error) {
    throw new Error(`Erro ao remover arquivos do Storage: ${error.message}`);
  }
}
