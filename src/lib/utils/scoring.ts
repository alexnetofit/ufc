import type { Fight, Pick, WinType, PredictedMethod } from '@/types';

/**
 * Mapeia o winType da API para o método de palpite
 */
export function mapWinTypeToMethod(winType: WinType | null): PredictedMethod | null {
  if (!winType) return null;
  
  switch (winType) {
    case 'KO':
    case 'TKO':
      return 'KO';
    case 'SUB':
      return 'SUB';
    case 'UD':
    case 'SD':
    case 'MD':
      return 'DEC';
    default:
      return null;
  }
}

/**
 * Mapeia o winType para o tipo de decisão
 */
export function mapWinTypeToDecision(winType: WinType | null): string | null {
  switch (winType) {
    case 'UD':
      return 'Unânime';
    case 'SD':
      return 'Dividida';
    case 'MD':
      return 'Maioria';
    default:
      return null;
  }
}

/**
 * Calcula os pontos de um palpite
 * 
 * REGRAS:
 * - Acertar vencedor: +10 pontos
 * - Acertar método: +20 pontos  
 * - Acertar round (KO/SUB): +30 pontos
 * - Acertar decisão (DEC): +30 pontos
 * - Máximo por luta: 60 pontos
 * - Errou vencedor: 0 pontos
 * - Luta cancelada ou NC: ignorar (0 pontos)
 */
export function calculatePoints(pick: Pick, fight: Fight): number {
  // Ignora lutas canceladas ou No Contest
  if (fight.status === 'cancelled' || fight.win_type === 'NC') {
    return 0;
  }

  // Se não tem resultado ainda, retorna 0
  if (!fight.winner_code || !fight.win_type) {
    return 0;
  }

  // Se errou o vencedor, a luta inteira vale 0
  if (pick.predicted_winner !== fight.winner_code) {
    return 0;
  }

  let points = 10; // Acertou vencedor

  // Verifica se acertou o método
  const actualMethod = mapWinTypeToMethod(fight.win_type as WinType);
  
  if (pick.predicted_method && pick.predicted_method === actualMethod) {
    points += 20; // Acertou método

    // Verifica detalhes
    if (actualMethod === 'DEC') {
      // Se método é decisão, verifica tipo de decisão
      const actualDecision = mapWinTypeToDecision(fight.win_type as WinType);
      if (pick.predicted_decision && pick.predicted_decision === actualDecision) {
        points += 30; // Acertou tipo de decisão
      }
    } else if (actualMethod === 'KO' || actualMethod === 'SUB') {
      // Se método é KO ou SUB, verifica round
      if (pick.predicted_round && fight.round && pick.predicted_round === fight.round) {
        points += 30; // Acertou round
      }
    }
  }

  return points; // Máximo: 60
}

/**
 * Calcula pontos potenciais máximos de um palpite
 */
export function calculatePotentialPoints(pick: Partial<Pick>): number {
  let points = 0;

  if (pick.predicted_winner) {
    points = 10; // Vencedor

    if (pick.predicted_method) {
      points += 20; // Método

      if (pick.predicted_method === 'DEC' && pick.predicted_decision) {
        points += 30; // Decisão
      } else if ((pick.predicted_method === 'KO' || pick.predicted_method === 'SUB') && pick.predicted_round) {
        points += 30; // Round
      }
    }
  }

  return points;
}

/**
 * Valida se um palpite está correto conforme as regras
 */
export function validatePick(pick: Partial<Pick>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Vencedor é obrigatório
  if (!pick.predicted_winner) {
    errors.push('Você precisa escolher um vencedor');
  }

  // Se escolheu método DEC, não pode ter round
  if (pick.predicted_method === 'DEC' && pick.predicted_round) {
    errors.push('Decisão não pode ter round');
  }

  // Se escolheu KO ou SUB, não pode ter decisão
  if ((pick.predicted_method === 'KO' || pick.predicted_method === 'SUB') && pick.predicted_decision) {
    errors.push('KO/SUB não pode ter tipo de decisão');
  }

  // Round deve estar entre 1 e 5
  if (pick.predicted_round && (pick.predicted_round < 1 || pick.predicted_round > 5)) {
    errors.push('Round deve estar entre 1 e 5');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}


