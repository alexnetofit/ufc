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
  filename?: string;
}

/** Campo que, se presente numa string decodificada, indica que é dados estruturados (não HTML nem outro payload). */
export const PLANO_ALIMENTAR_MARKER_FIELD = 'nome';
