import { PlanoAlimentarData, RefeicaoData } from './plano-alimentar-types';

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
// A OpenAI expõe o modelo de imagem como "gpt-image-1"; deixamos configurável caso
// a conta use um identificador diferente (ex: uma versão mais nova).
const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const COVER_QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'high';
const MEAL_QUALITY = process.env.OPENAI_MEAL_IMAGE_QUALITY || 'medium';
const TIMEOUT_MS = 120_000;

async function generateImage(prompt: string, size: string, quality: string): Promise<string> {
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
      body: JSON.stringify({ model: MODEL, prompt, n: 1, size, quality }),
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
  return generateImage(prompt, '1536x1024', COVER_QUALITY);
}

// Traduz palavras comuns de alimentos PT->EN para o prompt da imagem ficar mais preciso.
const FOOD_HINTS: Array<[RegExp, string]> = [
  [/frango/i, 'grilled chicken'],
  [/carne|patinho|alcatra|bife/i, 'beef'],
  [/peixe|til[aá]pia|salm[ãa]o/i, 'fish'],
  [/ovo/i, 'eggs'],
  [/whey|shake|prote[íi]na/i, 'a protein shake'],
  [/arroz/i, 'rice'],
  [/batata doce/i, 'sweet potato'],
  [/batata/i, 'potato'],
  [/p[ãa]o/i, 'whole grain bread'],
  [/aveia/i, 'oatmeal'],
  [/banana/i, 'banana'],
  [/salada|alface|folhas/i, 'green salad'],
  [/legumes|vegetais|br[óo]colis/i, 'vegetables'],
  [/azeite/i, 'olive oil'],
  [/pasta de amendoim|amendoim/i, 'peanut butter'],
  [/queijo/i, 'cheese'],
  [/fruta|ma[çc][ãa]|morango/i, 'fruit'],
  [/caf[ée]/i, 'a cup of coffee'],
  [/iogurte/i, 'yogurt'],
];

function describeMeal(meal: RefeicaoData): string {
  const itens = Array.isArray(meal.itens)
    ? meal.itens
    : (meal.itens ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const joined = itens.join(', ');
  const hints = FOOD_HINTS.filter(([re]) => re.test(joined)).map(([, en]) => en);
  const unique = Array.from(new Set(hints));
  if (unique.length > 0) return unique.join(', ');
  return joined || 'a healthy balanced meal';
}

/**
 * Foto individual de UMA refeição, para o card. Prato único, top-down, sem texto.
 */
export async function generateMealImage(meal: RefeicaoData): Promise<string> {
  const desc = describeMeal(meal);
  const prompt = `Professional top-down food photography of a single healthy meal: ${desc}.
One plate or bowl, centered, appetizing and fresh, soft natural daylight, clean light background,
editorial magazine quality, ultra realistic, high detail.
No text, no words, no letters, no numbers, no labels anywhere in the image.`;
  return generateImage(prompt, '1024x1024', MEAL_QUALITY);
}
