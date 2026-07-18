import { MAX_REFEICOES, PlanoAlimentarData, RefeicaoData } from './plano-alimentar-types';

export type ParsedPayload =
  | { kind: 'data'; data: PlanoAlimentarData; filename?: string }
  | { kind: 'html'; html: string; filename?: string };

// Remove um bloco de código markdown (```json/```html ... ```) que a IA eventualmente adiciona.
function stripMarkdownCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json|html)?\s*\n?([\s\S]*?)\n?```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

const BASE64_ONLY_REGEX = /^[A-Za-z0-9+/=\s]+$/;

// Ferramentas low-code (Leona) removem `<`, `>` e `"` do texto da IA; por isso o
// payload pode chegar em Base64 (alfabeto sem esses caracteres).
function decodeIfBase64(text: string): string {
  if (text.includes('<') || text.trimStart().startsWith('{') || text.trimStart().startsWith('[')) {
    return text;
  }
  if (!BASE64_ONLY_REGEX.test(text) || text.trim().length < 20) {
    return text;
  }
  try {
    const decoded = Buffer.from(text, 'base64').toString('utf-8');
    return decoded.length > 0 ? decoded : text;
  } catch {
    return text;
  }
}

const KEY_VALUE_FIELDS = [
  'nome', 'idade', 'altura_cm', 'peso_kg', 'genero', 'objetivo', 'rotina',
  'nivel_atividade', 'horario_acorda', 'horario_dorme', 'quantidade_refeicoes',
  'proteinas_preferidas', 'proteinas_que_nao_gosta', 'carboidratos_preferidos',
  'carboidratos_que_nao_gosta', 'gorduras_preferidas', 'gorduras_que_nao_gosta',
  'bebidas_preferidas', 'alimentos_indispensaveis', 'alimentos_que_recusa',
  'restricoes_alimentares', 'alergias', 'observacoes', 'filename',
];

function parseKeyValueLines(text: string): Record<string, string> | null {
  const result: Record<string, string> = {};
  let recognized = 0;
  for (const line of text.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    result[key] = value;
    if (KEY_VALUE_FIELDS.includes(key) || key.startsWith('refeicao_')) recognized++;
  }
  return recognized >= 3 ? result : null;
}

// Cardápio em campos planos "refeicao_N_horario/nome/itens" (formato chave:valor).
function extractRefeicoesFromFlatFields(obj: Record<string, unknown>): RefeicaoData[] {
  const refeicoes: RefeicaoData[] = [];
  for (let i = 1; i <= MAX_REFEICOES; i++) {
    const nome = obj[`refeicao_${i}_nome`];
    if (typeof nome !== 'string' || nome.trim().length === 0) continue;
    const horario = obj[`refeicao_${i}_horario`];
    const itens = obj[`refeicao_${i}_itens`];
    refeicoes.push({
      nome,
      horario: typeof horario === 'string' ? horario : undefined,
      itens: typeof itens === 'string' ? itens : undefined,
    });
  }
  return refeicoes;
}

/**
 * Interpreta o corpo cru da requisição em um payload estruturado (dados do plano)
 * ou, no modo legado, em HTML pronto. Aceita JSON, Base64, e o formato "chave: valor".
 */
export function parsePayload(rawBody: string, queryFilename: string | undefined): ParsedPayload {
  const candidate = stripMarkdownCodeFence(decodeIfBase64(rawBody));

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    parsed = parseKeyValueLines(candidate);
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;

    // Modo legado: HTML pronto
    if (typeof obj.html === 'string') {
      const filename = typeof obj.filename === 'string' ? obj.filename : queryFilename;
      return { kind: 'html', html: obj.html, filename };
    }

    const data = obj as PlanoAlimentarData;
    if (!Array.isArray(data.refeicoes)) {
      const refeicoes = extractRefeicoesFromFlatFields(obj);
      if (refeicoes.length > 0) data.refeicoes = refeicoes;
    }
    const filename =
      (typeof data.filename === 'string' && data.filename) ||
      (typeof data.nome === 'string' && data.nome) ||
      queryFilename;
    return { kind: 'data', data, filename };
  }

  // Corpo é HTML cru
  return { kind: 'html', html: candidate, filename: queryFilename };
}
