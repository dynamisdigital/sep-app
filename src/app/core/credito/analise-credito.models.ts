// Contratos da analise de credito: consulta aos bureaus (Serasa, SPC/Boa Vista, SCR do BACEN) e score
// interno explicavel. Ainda nao ha endpoint no backend: estes tipos sao a proposta de contrato
// (docs/atualizacao-07102026/ANALISE_DE_CREDITO.md) e hoje sao servidos pelo MSW.
//
// Principios: o front nunca calcula nem altera o score (so apresenta o que o motor devolveu); toda consulta
// a bureau exige base legal e consentimento do titular (LGPD); e quando um bureau nao responde, o motor
// nao decide sozinho: manda para analise manual.

export type FonteBureau = 'SERASA' | 'SPC_BOA_VISTA' | 'SCR_BACEN';

/** NAO_CONSULTADA: bureau desligado nos parametros ou ainda sem consulta. */
export type StatusConsultaBureau = 'OK' | 'INDISPONIVEL' | 'NAO_CONSULTADA';

export type TipoRestricao = 'PROTESTO' | 'CHEQUE_SEM_FUNDO' | 'DIVIDA_VENCIDA' | 'ACAO_JUDICIAL';

export interface RestricaoBureau {
  tipo: TipoRestricao;
  credor: string;
  valor: number;
  /** Data da ocorrencia, AAAA-MM-DD. */
  desde: string;
}

export interface ConsultaBureau {
  fonte: FonteBureau;
  status: StatusConsultaBureau;
  consultadaEm: string | null;
  /** Score de mercado da fonte (0 a 1000). O SCR nao tem score: traz so o endividamento. */
  scoreExterno: number | null;
  restricoes: RestricaoBureau[];
  /** SCR: soma das operacoes de credito do titular no sistema financeiro. */
  endividamentoTotal: number | null;
  /** SCR: maior atraso em dias entre as operacoes. */
  maiorAtrasoDias: number | null;
  mensagem: string | null;
}

export type SentidoFator = 'POSITIVO' | 'NEUTRO' | 'NEGATIVO';

/** Um fator do score interno, com o que foi observado e quanto pesou. Soma das contribuicoes = score. */
export interface FatorScore {
  chave: string;
  nome: string;
  /** Peso do fator no score, em %. A soma dos pesos e 100. */
  peso: number;
  /** Desempenho do fator, de 0 a 100. */
  pontos: number;
  /** Quanto o fator somou ao score (de 0 a peso x 10). */
  contribuicao: number;
  observado: string;
  sentido: SentidoFator;
  explicacao: string;
}

/**
 * Ajuste ao score fora dos seis fatores. Hoje existe um: o Pix Automático ativo, que mostra pagamento
 * previsível. O ajuste aparece em linha própria, com o motivo, e entra na soma que forma o score.
 */
export interface AjusteScore {
  chave: 'PIX_AUTOMATICO';
  nome: string;
  /** Pontos somados ao score (o score final continua entre 0 e 1.000). */
  pontos: number;
  explicacao: string;
}

export type FaixaRisco = 'A' | 'B' | 'C' | 'D' | 'E';

export type DecisaoSugerida = 'APROVAR' | 'ANALISE_MANUAL' | 'RECUSAR';

export interface RegraDisparada {
  regra: string;
  bloqueante: boolean;
  motivo: string;
}

export interface CapacidadePagamento {
  faturamentoMensal: number;
  parcelaEstimada: number;
  comprometimentoPct: number;
  comprometimentoMaximoPct: number;
  /** Maior valor cuja parcela cabe no comprometimento maximo, limitado ao teto e ao solicitado. */
  limiteSugerido: number;
}

export interface ParecerAnalista {
  decisao: 'APROVAR' | 'REJEITAR' | 'PENDENCIA';
  justificativa: string;
  /** True quando o analista decidiu diferente do que o motor sugeriu. */
  divergeDoMotor: boolean;
  analista: string;
  em: string;
}

export interface AnaliseCreditoResponse {
  propostaId: string;
  geradaEm: string;
  /** Consultas anteriores a esta data sao refeitas (parametro: validade da consulta). */
  validaAte: string;
  consultas: ConsultaBureau[];
  score: number;
  faixa: FaixaRisco;
  fatores: FatorScore[];
  capacidade: CapacidadePagamento;
  decisaoSugerida: DecisaoSugerida;
  regras: RegraDisparada[];
  /** Ajustes somados aos fatores; a soma das contribuições mais os ajustes é o score. */
  ajustes: AjusteScore[];
  /** Resumo em linguagem simples do porque da sugestao. */
  resumo: string;
  versaoModelo: string;
  parecer: ParecerAnalista | null;
}

export interface ExecutarAnaliseRequest {
  /** O titular foi informado e autorizou a consulta aos bureaus (LGPD, base legal de protecao ao credito). */
  consentimentoTitular: boolean;
  /** Refaz as consultas mesmo com uma analise ainda valida. */
  forcar?: boolean;
}

export interface RegistrarParecerRequest {
  decisao: ParecerAnalista['decisao'];
  justificativa: string;
}

export interface ParametrosAnalise {
  bureausHabilitados: Record<FonteBureau, boolean>;
  validadeConsultaDias: number;
  /** Score a partir do qual o motor sugere aprovar. */
  corteAprovacao: number;
  /** Score abaixo do qual o motor sugere recusar; entre os dois cortes, analise manual. */
  corteRecusa: number;
  comprometimentoMaximoPct: number;
  /** Pontos somados ao score quando o tomador tem Pix Automático ativo (0 desliga o ajuste). */
  bonusPixAutomatico: number;
}
