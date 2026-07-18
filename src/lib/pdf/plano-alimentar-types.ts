export interface RefeicaoData {
  horario?: string;
  nome?: string;
  itens?: string[] | string;
}

export interface PlanoAlimentarData {
  nome?: string;
  idade?: number | string;
  altura_cm?: number | string;
  peso_kg?: number | string;
  genero?: string;
  objetivo?: string;
  rotina?: string;
  nivel_atividade?: string;
  horario_acorda?: string;
  horario_dorme?: string;
  quantidade_refeicoes?: number | string;
  proteinas_preferidas?: string[] | string;
  proteinas_que_nao_gosta?: string[] | string;
  carboidratos_preferidos?: string[] | string;
  carboidratos_que_nao_gosta?: string[] | string;
  gorduras_preferidas?: string[] | string;
  gorduras_que_nao_gosta?: string[] | string;
  bebidas_preferidas?: string[] | string;
  alimentos_indispensaveis?: string[] | string;
  alimentos_que_recusa?: string[] | string;
  restricoes_alimentares?: string[] | string;
  alergias?: string[] | string;
  observacoes?: string;
  /** Cardápio do dia, já normalizado (vindo de JSON com array `refeicoes` ou dos campos planos `refeicao_N_*`). */
  refeicoes?: RefeicaoData[];
  filename?: string;
}

/** Número máximo de refeições suportado no formato plano "refeicao_N_*" (chave: valor). */
export const MAX_REFEICOES = 6;
