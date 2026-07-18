/**
 * Ícones SVG inline, minimalistas (estilo line-icon), sem depender de bibliotecas
 * externas ou fontes de ícone — só marcação SVG crua, segura para renderização
 * em PDF via Chromium headless.
 */

type IconName =
  | 'target'
  | 'calendar'
  | 'ruler'
  | 'scale'
  | 'person'
  | 'drumstick'
  | 'wheat'
  | 'droplet'
  | 'cup'
  | 'star'
  | 'ban'
  | 'alert'
  | 'clock'
  | 'sunrise'
  | 'sun'
  | 'moon'
  | 'apple'
  | 'utensils'
  | 'sparkles';

const PATHS: Record<IconName, string> = {
  target: `<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>`,
  calendar: `<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17"/><path d="M8 3v3.5"/><path d="M16 3v3.5"/>`,
  ruler: `<rect x="3.5" y="6" width="17" height="12" rx="2"/><path d="M7.5 6v3"/><path d="M11 6v5"/><path d="M14.5 6v3"/><path d="M18 6v5"/>`,
  scale: `<circle cx="12" cy="13" r="7.2"/><path d="M12 9v4l2.6 2"/><path d="M9.5 3.5h5"/>`,
  person: `<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5"/>`,
  drumstick: `<path d="M9.5 13.8 4.8 18.5a1.9 1.9 0 1 0 2.7 2.7l4.7-4.7"/><path d="M9.7 14 15 8.7a4.2 4.2 0 1 0-3.7-3.7A4.3 4.3 0 0 0 8.7 9z"/>`,
  wheat: `<path d="M12 21V6"/><path d="M12 6 9 8.5"/><path d="M12 6l3 2.5"/><path d="M12 10.5 9 13"/><path d="M12 10.5l3 2.5"/><path d="M12 15 9 17.5"/><path d="M12 15l3 2.5"/><circle cx="12" cy="4.2" r="1.6"/>`,
  droplet: `<path d="M12 3.2s6.4 7.4 6.4 11.8a6.4 6.4 0 1 1-12.8 0C5.6 10.6 12 3.2 12 3.2z"/>`,
  cup: `<path d="M6 4h11l-1 11.5a4 4 0 0 1-4 3.7h-1a4 4 0 0 1-4-3.7z"/><path d="M17 7h1.6a2.4 2.4 0 0 1 0 4.8H17"/><path d="M8 20.5h7"/>`,
  star: `<path d="M12 3.5l2.35 4.9 5.4.7-3.9 3.8.95 5.4L12 15.8l-4.8 2.5.95-5.4-3.9-3.8 5.4-.7z"/>`,
  ban: `<circle cx="12" cy="12" r="9"/><path d="M6 6l12 12"/>`,
  alert: `<path d="M12 3.5 21.5 20h-19z"/><path d="M12 9.5v4.5"/><circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none"/>`,
  clock: `<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.5 2"/>`,
  sunrise: `<path d="M12 4v3.5"/><path d="M4.5 12h-2"/><path d="M21.5 12h-2"/><path d="M6 6l1.6 1.6"/><path d="M16.4 7.6 18 6"/><path d="M6 18h12"/><path d="M8 18a4 4 0 0 1 8 0"/>`,
  sun: `<circle cx="12" cy="12" r="4.3"/><path d="M12 3v2.2"/><path d="M12 18.8V21"/><path d="M4.4 4.4l1.5 1.5"/><path d="M18.1 18.1l1.5 1.5"/><path d="M3 12h2.2"/><path d="M18.8 12H21"/><path d="M4.4 19.6l1.5-1.5"/><path d="M18.1 5.9l1.5-1.5"/>`,
  moon: `<path d="M20 14.2A8.5 8.5 0 1 1 9.8 4a6.8 6.8 0 0 0 10.2 10.2z"/>`,
  apple: `<path d="M12 8.2c2-2.4 6-2 6.4 2 .5 4.6-2.6 10-6.4 10s-6.9-5.4-6.4-10c.4-4 4.4-4.4 6.4-2z"/><path d="M12 8.2s-.3-3 2-4.2"/>`,
  utensils: `<path d="M7 3v7a2 2 0 0 0 4 0V3"/><path d="M9 10v11"/><path d="M16 3c-1.4 0-2.5 1.8-2.5 5.5S14.6 13 16 13v8"/>`,
  sparkles: `<path d="M11.5 3l1.2 3.6L16.3 8l-3.6 1.2L11.5 13l-1.2-3.8L6.7 8l3.6-1.4z"/><path d="M18.5 14l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>`,
};

export function icon(name: IconName, size = 18): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${PATHS[name]}</svg>`;
}

/** Escolhe um ícone de acordo com o nome/horário da refeição. */
export function mealIcon(nomeRefeicao: string): string {
  const n = nomeRefeicao.toLowerCase();
  if (n.includes('café') || n.includes('cafe') || n.includes('manhã') || n.includes('manha')) return icon('sunrise', 20);
  if (n.includes('almoço') || n.includes('almoco')) return icon('sun', 20);
  if (n.includes('jantar')) return icon('moon', 20);
  if (n.includes('ceia')) return icon('moon', 20);
  if (n.includes('lanche') || n.includes('snack')) return icon('apple', 20);
  return icon('utensils', 20);
}
