import { format, formatDistanceToNow, isAfter, isBefore, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata data para exibição
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "d 'de' MMMM, yyyy", { locale: ptBR });
}

/**
 * Formata data e hora
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "d 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR });
}

/**
 * Formata hora apenas
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'HH:mm', { locale: ptBR });
}

/**
 * Retorna distância relativa (ex: "em 2 dias", "há 3 horas")
 */
export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { locale: ptBR, addSuffix: true });
}

/**
 * Converte Unix timestamp para Date
 */
export function fromUnixTimestamp(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Verifica se ainda pode fazer palpite (1h antes do início)
 */
export function canMakePick(scheduledFor: string | Date): boolean {
  const fightDate = typeof scheduledFor === 'string' ? new Date(scheduledFor) : scheduledFor;
  const deadline = addHours(fightDate, -1);
  return isBefore(new Date(), deadline);
}

/**
 * Verifica se o evento já passou
 */
export function isPast(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return isBefore(d, new Date());
}

/**
 * Verifica se o evento é hoje
 */
export function isToday(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Pega o próximo sábado a partir de uma data
 */
export function getNextSaturday(from: Date = new Date()): Date {
  const day = from.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  const nextSaturday = new Date(from);
  nextSaturday.setDate(from.getDate() + daysUntilSaturday);
  nextSaturday.setHours(0, 0, 0, 0);
  return nextSaturday;
}

/**
 * Verifica se uma data é sábado
 */
export function isSaturday(date: Date): boolean {
  return date.getDay() === 6;
}

/**
 * Verifica se um evento está aberto para palpites
 * - Primeiro evento (próximo): sempre aberto
 * - Demais eventos: abrem 1 dia após a data do evento anterior
 */
export function canEventReceivePicks(
  eventDate: string | Date,
  previousEventDate: string | Date | null
): boolean {
  // Se não há evento anterior, é o primeiro/próximo - sempre aberto
  if (!previousEventDate) return true;
  
  const prevDate = typeof previousEventDate === 'string' 
    ? new Date(previousEventDate) 
    : previousEventDate;
  
  // Abre 1 dia após a data do evento anterior às 00:00
  const opensAt = new Date(prevDate);
  opensAt.setDate(opensAt.getDate() + 1);
  opensAt.setHours(0, 0, 0, 0);
  
  return new Date() >= opensAt;
}

/**
 * Retorna a data em que o evento abrirá para palpites
 */
export function getEventOpensAt(previousEventDate: string | Date | null): Date | null {
  if (!previousEventDate) return null;
  
  const prevDate = typeof previousEventDate === 'string' 
    ? new Date(previousEventDate) 
    : previousEventDate;
  
  const opensAt = new Date(prevDate);
  opensAt.setDate(opensAt.getDate() + 1);
  opensAt.setHours(0, 0, 0, 0);
  
  return opensAt;
}

/**
 * Verifica se um evento está "ao vivo" (acontecendo agora)
 * Considera evento ao vivo se: início <= agora <= início + 6 horas
 */
export function isEventLive(eventDate: string | Date): boolean {
  const d = typeof eventDate === 'string' ? new Date(eventDate) : eventDate;
  const now = new Date();
  const eventEnd = addHours(d, 6);
  
  return isAfter(now, d) && isBefore(now, eventEnd);
}

/**
 * Verifica se um evento tem lutas em andamento ou prestes a começar
 * Usado pelo cron para decidir se deve buscar resultados
 */
export function shouldFetchResults(eventDate: string | Date): boolean {
  const d = typeof eventDate === 'string' ? new Date(eventDate) : eventDate;
  const now = new Date();
  const eventEnd = addHours(d, 8); // 8 horas de margem para eventos longos
  
  return isAfter(now, d) && isBefore(now, eventEnd);
}
