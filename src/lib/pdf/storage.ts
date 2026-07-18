import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const PDFS_BUCKET = 'pdfs';

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

/**
 * Faz upload de um PDF para o Supabase Storage e retorna a URL pública.
 */
export async function uploadPdf(
  supabase: SupabaseClient,
  pdfBuffer: Buffer,
  filenameHint?: string
): Promise<string> {
  const base = filenameHint ? sanitizeFilename(filenameHint) : 'documento';
  const filePath = `${base}-${randomUUID()}.pdf`;

  const { error } = await supabase.storage
    .from(PDFS_BUCKET)
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) {
    throw new Error(`Erro ao fazer upload do PDF: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(PDFS_BUCKET)
    .getPublicUrl(filePath);

  return publicUrl;
}
