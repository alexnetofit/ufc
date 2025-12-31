// ========================================
// DATABASE TYPES
// ========================================

export interface Profile {
  id: string;
  nickname: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  pix_transaction_id: string | null;
  reference_month: string | null;
  notes: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  profile?: Profile;
  confirmed_by_profile?: Profile;
}

export type PaymentStatus = 'pending' | 'confirmed' | 'cancelled' | 'refunded';
export type PaymentMethod = 'pix' | 'credit_card' | 'other';

export interface Event {
  id: string;
  name: string;
  scheduled_date: string;
  location: string | null;
  created_at: string;
}

export interface Fight {
  id: string;
  event_id: string;
  api_id: string;
  fighter1_name: string;
  fighter1_id: number;
  fighter2_name: string;
  fighter2_id: number;
  weight_class: string | null;
  fight_type: string; // 'main', 'prelims', 'earlyprelims'
  scheduled_for: string;
  status: FightStatus;
  winner_code: number | null; // 1 ou 2
  win_type: WinType | null;
  round: number | null;
  created_at: string;
  updated_at: string;
  // Joins
  event?: Event;
}

export interface Pick {
  id: string;
  user_id: string;
  fight_id: string;
  predicted_winner: 1 | 2;
  predicted_method: PredictedMethod | null;
  predicted_round: number | null; // 1-5
  predicted_decision: PredictedDecision | null;
  points: number;
  created_at: string;
  updated_at: string;
  // Joins
  fight?: Fight;
}

export interface Ranking {
  id: string;
  user_id: string;
  event_id: string;
  total_points: number;
  picks_count: number;
  correct_picks: number;
  created_at: string;
  updated_at: string;
  // Joins
  profile?: Profile;
  event?: Event;
}

// ========================================
// ENUMS E TIPOS AUXILIARES
// ========================================

export type FightStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';

export type WinType = 
  | 'UD'   // Decisão Unânime
  | 'SD'   // Decisão Dividida
  | 'MD'   // Decisão Maioria
  | 'KO'   // Nocaute
  | 'TKO'  // Nocaute Técnico
  | 'SUB'  // Submissão
  | 'DQ'   // Desqualificação
  | 'NC';  // Sem Resultado

export type PredictedMethod = 'KO' | 'SUB' | 'DEC';

export type PredictedDecision = 'Unânime' | 'Dividida' | 'Maioria';

// ========================================
// API TYPES (RapidAPI MMA)
// ========================================

export interface MMAAPIEvent {
  id: number;
  customId: string;
  homeTeam: {
    name: string;
    id: number;
    country?: {
      name: string;
      alpha2?: string;
    };
  };
  awayTeam: {
    name: string;
    id: number;
    country?: {
      name: string;
      alpha2?: string;
    };
  };
  tournament: {
    name: string;
    uniqueTournament?: {
      name: string;
      id: number;
    };
  };
  startTimestamp: number;
  status: {
    description: string;
    type: string;
  };
  weightClass?: string;
  fightType?: string;
  winType?: string | null;
  winnerCode?: number | null;
  round?: {
    round?: number;
  };
}

export interface MMAAPIResponse {
  events: MMAAPIEvent[];
}

// ========================================
// APP TYPES
// ========================================

export interface FightWithPick extends Fight {
  userPick?: Pick;
}

export interface EventWithFights extends Event {
  fights: Fight[];
}

export interface RankingEntry {
  position: number;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  total_points: number;
  picks_count: number;
  correct_picks: number;
  accuracy: number; // percentual
}

// ========================================
// FORM TYPES
// ========================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  nickname: string;
}

export interface PickFormData {
  predicted_winner: 1 | 2;
  predicted_method: PredictedMethod | null;
  predicted_round: number | null;
  predicted_decision: PredictedDecision | null;
}

// ========================================
// UTILITÁRIOS DE MAPEAMENTO
// ========================================

export const WIN_TYPE_LABELS: Record<WinType, string> = {
  'UD': 'Decisão Unânime',
  'SD': 'Decisão Dividida',
  'MD': 'Decisão Maioria',
  'KO': 'Nocaute',
  'TKO': 'Nocaute Técnico',
  'SUB': 'Submissão',
  'DQ': 'Desqualificação',
  'NC': 'Sem Resultado',
};

export const METHOD_LABELS: Record<PredictedMethod, string> = {
  'KO': 'Nocaute/TKO',
  'SUB': 'Submissão',
  'DEC': 'Decisão',
};

export const DECISION_LABELS: Record<PredictedDecision, string> = {
  'Unânime': 'Decisão Unânime',
  'Dividida': 'Decisão Dividida',
  'Maioria': 'Decisão Maioria',
};

export const FIGHT_TYPE_ORDER: Record<string, number> = {
  'main': 1,
  'prelims': 2,
  'earlyprelims': 3,
};

export const WEIGHT_CLASS_LABELS: Record<string, string> = {
  'strawweight': 'Peso Palha',
  'flyweight': 'Peso Mosca',
  'bantamweight': 'Peso Galo',
  'featherweight': 'Peso Pena',
  'lightweight': 'Peso Leve',
  'welterweight': 'Peso Meio-Médio',
  'middleweight': 'Peso Médio',
  'lightheavyweight': 'Peso Meio-Pesado',
  'heavyweight': 'Peso Pesado',
  // Feminino
  'wstrawweight': 'Peso Palha Feminino',
  'wflyweight': 'Peso Mosca Feminino',
  'wbantamweight': 'Peso Galo Feminino',
  'wfeatherweight': 'Peso Pena Feminino',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  'pending': 'Pendente',
  'confirmed': 'Confirmado',
  'cancelled': 'Cancelado',
  'refunded': 'Reembolsado',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  'pix': 'PIX',
  'credit_card': 'Cartão de Crédito',
  'other': 'Outro',
};

// ========================================
// ADMIN TYPES
// ========================================

export interface UserSummary {
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
  total_points: number;
  total_picks: number;
  correct_picks: number;
  accuracy: number;
  confirmed_payments: number;
  total_paid: number | null;
}

export interface PaymentWithProfile extends Payment {
  nickname: string;
  confirmed_by_nickname: string | null;
}

