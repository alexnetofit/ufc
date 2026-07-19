import { PlanoAlimentarData, RefeicaoData } from './plano-alimentar-types';

const OPENAI_IMAGES_URL = 'https://api.openai.com/v1/images/generations';
// A OpenAI expõe o modelo de imagem como "gpt-image-1"; deixamos configurável caso
// a conta use um identificador diferente (ex: uma versão mais nova).
const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';
const COVER_QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'medium';
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

function itensDaRefeicao(meal: RefeicaoData): string[] {
  return Array.isArray(meal.itens)
    ? meal.itens.map((s) => String(s).trim()).filter(Boolean)
    : (meal.itens ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

// Descreve cada refeição em português (o texto será renderizado DENTRO da imagem).
function describeMealCardPT(meal: RefeicaoData, i: number): string {
  const nome = (meal.nome ?? `Refeição ${i}`).trim();
  const horario = (meal.horario ?? '').toString().trim();
  const itens = itensDaRefeicao(meal).join(', ') || 'refeição saudável';
  return `Card ${i} — Nome: "${nome}"; Horário: "${horario}"; Alimentos: ${itens}`;
}

/**
 * UMA única imagem que É a página inteira do cardápio: um grid de cards, cada card com a
 * FOTO da refeição no topo e, abaixo, o nome/horário/lista de alimentos renderizados como
 * texto DENTRO da própria imagem (estilo app de nutrição). Texto em português.
 */
export async function generateMealsImage(refeicoes: RefeicaoData[]): Promise<string> {
  const n = refeicoes.length || 4;
  const pratos = refeicoes.map((m, i) => describeMealCardPT(m, i + 1)).join('\n');
  const prompt = `Professional nutrition meal plan.

Create a clean, modern grid of ${n} independent meal cards.

Each card represents ONE meal from:
${pratos}

For each meal card:

• A professional ultra-realistic food photograph of only that meal at the top.
• Below the photo, a clean white information section.
• Display the meal name.
• Display the meal time.
• Display the foods for that meal as a bullet list.

All visible text must be written in Brazilian Portuguese, exactly as provided, spelled correctly.

Each meal must have its own separate card.
Never combine multiple meals into a single photograph.
The food image should illustrate only the corresponding meal.

Arrange all cards with generous spacing on a clean white background, using a premium nutrition app aesthetic with rounded corners, subtle shadows, and consistent styling.

Editorial food photography, soft natural lighting, ultra realistic, high detail.

No extra decorative elements.
No logos.
No watermarks.`;
  return generateImage(prompt, '1536x1024', MEAL_QUALITY);
}
