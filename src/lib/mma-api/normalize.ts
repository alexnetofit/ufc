import type { MMAAPIEvent, Fight, Event, FightStatus, WinType } from '@/types';
import { fromUnixTimestamp } from '@/lib/utils/date';

/**
 * Mapeia o status da API para o status interno
 */
function mapStatus(apiStatus: string): FightStatus {
  const statusMap: Record<string, FightStatus> = {
    'Not started': 'scheduled',
    'Scheduled': 'scheduled',
    'Live': 'live',
    'In progress': 'live',
    'Ended': 'finished',
    'Finished': 'finished',
    'Cancelled': 'cancelled',
    'Postponed': 'cancelled',
  };
  return statusMap[apiStatus] || 'scheduled';
}

/**
 * Mapeia o fightType da API para o formato interno
 */
function mapFightType(apiType: string | undefined): string {
  if (!apiType) return 'prelims';
  const typeMap: Record<string, string> = {
    'main': 'main',
    'maincard': 'main',
    'main card': 'main',
    'prelims': 'prelims',
    'preliminaries': 'prelims',
    'earlyprelims': 'earlyprelims',
    'early prelims': 'earlyprelims',
    'early preliminaries': 'earlyprelims',
  };
  return typeMap[apiType.toLowerCase()] || 'prelims';
}

/**
 * Normaliza o winType da API
 */
function mapWinType(apiWinType: string | null | undefined): WinType | null {
  if (!apiWinType) return null;
  const type = apiWinType.toUpperCase();
  const validTypes: WinType[] = ['UD', 'SD', 'MD', 'KO', 'TKO', 'SUB', 'DQ', 'NC'];
  return validTypes.includes(type as WinType) ? (type as WinType) : null;
}

/**
 * Extrai o nome do evento da resposta da API
 */
export function extractEventName(event: MMAAPIEvent): string {
  return event.tournament?.name || 'UFC Event';
}

/**
 * Extrai a data do evento da resposta da API
 */
export function extractEventDate(event: MMAAPIEvent): Date {
  return fromUnixTimestamp(event.startTimestamp);
}

/**
 * Normaliza um evento da API para o formato do banco
 */
export function normalizeEvent(events: MMAAPIEvent[]): Omit<Event, 'id' | 'created_at'> | null {
  if (!events.length) return null;

  const firstEvent = events[0];
  
  return {
    name: extractEventName(firstEvent),
    scheduled_date: extractEventDate(firstEvent).toISOString(),
    location: null, // API não fornece location diretamente
  };
}

/**
 * Normaliza uma luta da API para o formato do banco
 */
export function normalizeFight(
  apiEvent: MMAAPIEvent, 
  eventId: string
): Omit<Fight, 'id' | 'created_at' | 'updated_at'> {
  return {
    event_id: eventId,
    api_id: apiEvent.customId,
    fighter1_name: apiEvent.homeTeam.name,
    fighter1_id: apiEvent.homeTeam.id,
    fighter2_name: apiEvent.awayTeam.name,
    fighter2_id: apiEvent.awayTeam.id,
    weight_class: apiEvent.weightClass || null,
    fight_type: mapFightType(apiEvent.fightType),
    scheduled_for: fromUnixTimestamp(apiEvent.startTimestamp).toISOString(),
    status: mapStatus(apiEvent.status.description),
    winner_code: apiEvent.winnerCode || null,
    win_type: mapWinType(apiEvent.winType),
    round: apiEvent.round?.round || null,
  };
}

/**
 * Normaliza múltiplas lutas
 */
export function normalizeFights(
  apiEvents: MMAAPIEvent[], 
  eventId: string
): Omit<Fight, 'id' | 'created_at' | 'updated_at'>[] {
  return apiEvents.map(event => normalizeFight(event, eventId));
}

/**
 * Agrupa lutas por evento
 */
export function groupFightsByEvent(apiEvents: MMAAPIEvent[]): Map<string, MMAAPIEvent[]> {
  const groups = new Map<string, MMAAPIEvent[]>();
  
  for (const event of apiEvents) {
    const eventName = extractEventName(event);
    if (!groups.has(eventName)) {
      groups.set(eventName, []);
    }
    groups.get(eventName)!.push(event);
  }
  
  return groups;
}







