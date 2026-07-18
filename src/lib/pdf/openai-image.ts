import { PlanoAlimentarData } from './plano-alimentar-types';

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
// A OpenAI expõe o modelo de imagem como "gpt-image-1"; deixamos configurável caso
// a conta use um identificador diferente (ex: uma versão mais nova).
const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'high';
// Tamanho paisagem suportado pelo gpt-image-1 (3:2, recortado para 16:9 no CSS).
const SIZE = '1536x1024';
const TIMEOUT_MS = 120_000;

async function generateImage(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY não configurada');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(OPENAI_IMAGES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        n: 1,
        size: SIZE,
        quality: QUALITY,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`OpenAI images ${response.status}: ${errText.slice(0, 500)}`);
    }

    const json = (await response.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const item = json.data?.[0];

    if (item?.b64_json) {
      return `data:image/png;base64,${item.b64_json}`;
    }
    if (item?.url) {
      // Fallback: alguns modelos retornam URL — baixa e converte para data URI
      const imgResp = await fetch(item.url, { signal: controller.signal });
      const buf = Buffer.from(await imgResp.arrayBuffer());
      return `data:image/png;base64,${buf.toString('base64')}`;
    }

    throw new Error('OpenAI images: resposta sem imagem');
  } finally {
    clearTimeout(timeout);
  }
}

function objetivoVibe(objetivo: string | undefined): string {
  const o = (objetivo ?? '').toLowerCase();
  if (o.includes('emagrec') || o.includes('defin') || o.includes('perd')) {
    return 'light, fresh, lean and vibrant — grilled lean proteins, leafy greens, colorful vegetables';
  }
  if (o.includes('ganh') || o.includes('massa') || o.includes('hipertrof')) {
    return 'hearty and energizing — generous portions of proteins, whole grains, rice, eggs and healthy carbs';
  }
  return 'balanced and wholesome — a varied, colorful plate of proteins, grains and vegetables';
}

/**
 * Imagem HERO para a capa: fotografia gastronômica premium, SEM texto na imagem
 * (o texto real é sobreposto por HTML). Cores/comida coerentes com o objetivo.
 */
export async function generateCoverImage(data: PlanoAlimentarData): Promise<string> {
  const vibe = objetivoVibe(data.objetivo);
  const prompt = `Professional overhead food photography for a premium nutrition plan cover.
A beautifully styled, minimalist arrangement of healthy fresh food on a clean modern surface: ${vibe}.
Soft natural daylight, shallow depth of field, elegant negative space on the left side for text overlay,
muted sophisticated color palette, editorial magazine quality, ultra realistic, high detail.
No text, no words, no letters, no numbers, no labels anywhere in the image.`;
  return generateImage(prompt);
}

/**
 * Imagem de fundo para a página de refeições: um spread de pratos saudáveis
 * variados, também SEM texto (a lista de refeições é sobreposta por HTML).
 */
export async function generateMealsImage(data: PlanoAlimentarData): Promise<string> {
  const vibe = objetivoVibe(data.objetivo);
  const prompt = `Professional food photography: an elegant flat-lay spread of several distinct healthy meals
across the day (breakfast, lunch, snack, dinner), ${vibe}.
Multiple small plates and bowls arranged cleanly on a bright modern table, soft daylight, appetizing and fresh,
editorial magazine quality, ultra realistic, high detail, plenty of clean space between dishes.
No text, no words, no letters, no numbers, no labels anywhere in the image.`;
  return generateImage(prompt);
}
