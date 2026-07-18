import { PlanoAlimentarData } from './plano-alimentar-types';

export interface MacrosCalculados {
  calorias: number;
  proteina_g: number;
  carboidrato_g: number;
  gordura_g: number;
  /** true quando não havia dados suficientes (peso/altura/idade) para um cálculo confiável. */
  estimado: boolean;
}

function toNumber(value: number | string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isFeminino(genero: string | undefined): boolean {
  const g = (genero ?? '').toLowerCase();
  return g.startsWith('f') || g.includes('femin') || g.includes('mulher');
}

// Multiplicador de atividade (fator TDEE) inferido do texto livre de nivel_atividade/rotina.
function fatorAtividade(data: PlanoAlimentarData): number {
  const t = `${data.nivel_atividade ?? ''} ${data.rotina ?? ''}`.toLowerCase();

  // Frequência de treino explícita (ex: "6x por semana")
  const freqMatch = t.match(/(\d+)\s*(x|vezes)/);
  const freq = freqMatch ? parseInt(freqMatch[1], 10) : null;
  if (freq !== null) {
    if (freq >= 6) return 1.725;
    if (freq >= 3) return 1.55;
    if (freq >= 1) return 1.375;
  }

  if (t.includes('sedent') || t.includes('parad') || t.includes('nenhum')) return 1.2;
  if (t.includes('intens') || t.includes('atleta') || t.includes('pesad')) return 1.725;
  if (t.includes('moderad') || t.includes('musculac') || t.includes('academia') || t.includes('treino')) return 1.55;
  if (t.includes('leve') || t.includes('caminhad')) return 1.375;

  return 1.375; // padrão levemente ativo
}

// Ajuste calórico e distribuição de macros conforme o objetivo.
function estrategiaObjetivo(objetivo: string | undefined): {
  ajuste: number; // multiplicador sobre o TDEE
  protPorKg: number; // g de proteína por kg
  pctGordura: number; // % das calorias vindo de gordura
} {
  const o = (objetivo ?? '').toLowerCase();

  const emagrecer = o.includes('emagrec') || o.includes('perd') || o.includes('defin') || o.includes('secar') || o.includes('cutting');
  const ganhar = o.includes('ganh') || o.includes('massa') || o.includes('hipertrof') || o.includes('bulking') || o.includes('aument');

  if (emagrecer) return { ajuste: 0.8, protPorKg: 2.0, pctGordura: 0.25 };
  if (ganhar) return { ajuste: 1.1, protPorKg: 1.8, pctGordura: 0.25 };
  return { ajuste: 1.0, protPorKg: 1.6, pctGordura: 0.28 }; // manutenção/saúde
}

/**
 * Estima calorias e macros a partir dos dados da consulta.
 * BMR: Mifflin-St Jeor. TDEE: BMR × fator de atividade. Ajuste conforme objetivo.
 * Retorna null quando faltam peso/altura/idade para um cálculo minimamente confiável.
 */
export function calcularMacros(data: PlanoAlimentarData): MacrosCalculados | null {
  const peso = toNumber(data.peso_kg);
  const altura = toNumber(data.altura_cm);
  const idade = toNumber(data.idade);

  if (peso === null || altura === null || idade === null) {
    return null;
  }

  const s = isFeminino(data.genero) ? -161 : 5;
  const bmr = 10 * peso + 6.25 * altura - 5 * idade + s;
  const tdee = bmr * fatorAtividade(data);

  const { ajuste, protPorKg, pctGordura } = estrategiaObjetivo(data.objetivo);
  const calorias = Math.round((tdee * ajuste) / 10) * 10;

  const proteina_g = Math.round(protPorKg * peso);
  const gordura_g = Math.round((calorias * pctGordura) / 9);
  const calRestantes = Math.max(calorias - proteina_g * 4 - gordura_g * 9, 0);
  const carboidrato_g = Math.round(calRestantes / 4);

  return {
    calorias,
    proteina_g,
    carboidrato_g,
    gordura_g,
    estimado: true,
  };
}
