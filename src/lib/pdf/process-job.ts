import { SupabaseClient } from '@supabase/supabase-js';
import { ParsedPayload } from './parse-payload';
import { calcularMacros } from './macros';
import { generateCoverImage, generateMealsImage } from './openai-image';
import { renderPlanoPremiumHtml } from './plano-premium-template';
import { generatePdfFromHtml } from './generate';
import { uploadPdfReturningPath } from './storage';
import { updateJob } from './jobs';

/**
 * Executa o trabalho pesado de um job: calcula macros, gera as imagens (IA),
 * renderiza o PDF 16:9 e faz upload. Atualiza o status do job ao longo do caminho.
 * Nunca lança — sempre registra o resultado (completed/failed) na tabela.
 */
export async function processJob(
  supabase: SupabaseClient,
  jobId: string,
  payload: ParsedPayload
): Promise<void> {
  try {
    await updateJob(supabase, jobId, { status: 'processing' });

    let pdfBuffer: Buffer;
    const filename = payload.filename;

    if (payload.kind === 'html') {
      // Modo legado: HTML pronto -> PDF A4
      pdfBuffer = await generatePdfFromHtml(payload.html);
    } else {
      const data = payload.data;
      const macros = calcularMacros(data);

      let coverImage: string | undefined;
      let mealsImage: string | undefined;

      if (process.env.OPENAI_API_KEY) {
        const [cover, meals] = await Promise.all([
          generateCoverImage(data).catch((e) => {
            console.error(`[PDF][job ${jobId}] imagem de capa falhou:`, e?.message ?? e);
            return undefined;
          }),
          generateMealsImage(data).catch((e) => {
            console.error(`[PDF][job ${jobId}] imagem de refeições falhou:`, e?.message ?? e);
            return undefined;
          }),
        ]);
        coverImage = cover;
        mealsImage = meals;
      } else {
        console.warn(`[PDF][job ${jobId}] OPENAI_API_KEY ausente — gerando PDF com fundo em gradiente.`);
      }

      const html = renderPlanoPremiumHtml(data, { coverImage, mealsImage, macros });
      pdfBuffer = await generatePdfFromHtml(html, { width: '1280px', height: '720px' });
    }

    const { url, path } = await uploadPdfReturningPath(supabase, pdfBuffer, filename);
    await updateJob(supabase, jobId, {
      status: 'completed',
      result_url: url,
      file_paths: [path],
    });
  } catch (err) {
    console.error(`[PDF][job ${jobId}] falhou:`, err);
    await updateJob(supabase, jobId, {
      status: 'failed',
      error_message: err instanceof Error ? err.message : 'erro desconhecido',
    });
  }
}
