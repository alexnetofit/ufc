import type { MMAAPIEvent, MMAAPIResponse } from '@/types';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST || 'mmaapi.p.rapidapi.com';
const UFC_TOURNAMENT_ID = 19906;

interface APIOptions {
  cache?: RequestCache;
  revalidate?: number;
}

/**
 * Cliente base para chamadas à API MMA
 */
async function fetchMMAAPI<T>(
  endpoint: string, 
  options: APIOptions = {}
): Promise<T> {
  if (!RAPIDAPI_KEY) {
    throw new Error('RAPIDAPI_KEY não configurada');
  }

  const url = `https://${RAPIDAPI_HOST}${endpoint}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'x-rapidapi-host': RAPIDAPI_HOST,
      'x-rapidapi-key': RAPIDAPI_KEY,
    },
    cache: options.cache || 'no-store',
    next: options.revalidate ? { revalidate: options.revalidate } : undefined,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Busca os próximos eventos do UFC
 * Chamada: Segunda-feira 09:00
 */
export async function getNextEvents(page = 0): Promise<MMAAPIEvent[]> {
  const data = await fetchMMAAPI<MMAAPIResponse>(
    `/api/mma/unique-tournament/${UFC_TOURNAMENT_ID}/main-events/next/${page}`
  );
  return data.events || [];
}

/**
 * Busca todas as lutas de uma data específica
 * @param day Dia do mês (1-31)
 * @param month Mês (1-12)
 * @param year Ano (ex: 2024)
 */
export async function getFightsByDate(
  day: number, 
  month: number, 
  year: number
): Promise<MMAAPIEvent[]> {
  const data = await fetchMMAAPI<MMAAPIResponse>(
    `/api/mma/unique-tournament/${UFC_TOURNAMENT_ID}/schedules/${day}/${month}/${year}`
  );
  return data.events || [];
}

/**
 * Busca a imagem de um lutador
 * Retorna a URL da imagem ou null se não encontrar
 */
export function getFighterImageUrl(fighterId: number): string {
  return `https://${RAPIDAPI_HOST}/api/mma/team/${fighterId}/image`;
}

/**
 * Verifica se a API está funcionando
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await getNextEvents(0);
    return true;
  } catch {
    return false;
  }
}




