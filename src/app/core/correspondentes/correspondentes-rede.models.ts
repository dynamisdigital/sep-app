// Contratos da rede de sub-correspondentes. O correspondente majoritario capta clientes e pode credenciar
// sub-correspondentes, que tambem lancam os proprios clientes. Ainda nao ha endpoint no backend: estes tipos
// sao a proposta de contrato (docs/atualizacao-07102026/CONTRATO_BACKEND_CORRESPONDENTES.md, secao Rede) e hoje
// sao servidos pelo MSW. O limite de comissao e do SEP e e imposto pelo backend; o front mostra o teto e
// recusa de cara o que o passa, mas a decisao final nao e dele.

import type { BaseComissao } from './correspondentes-gestao.models';

export type NivelCorrespondente = 'MAJORITARIO' | 'SUB';

/** PENDENTE: cadastro enviado, aguardando a validacao do SEP; so ATIVO opera e capta clientes. */
export type StatusSub = 'ATIVO' | 'PENDENTE' | 'SUSPENSO';

/**
 * Como a comissao de um produto se reparte. `percentualSep` e o que o SEP paga pela regra do produto;
 * `tetoSub` e o maximo que o SEP aceita repassar a um sub-correspondente; `percentualSub` e o que o
 * majoritario escolheu (sempre <= tetoSub). O que sobra, `margemMajoritario`, fica com o majoritario.
 */
export interface PercentualSub {
  produto: string;
  base: BaseComissao;
  percentualSep: number;
  tetoSub: number;
  percentualSub: number;
  margemMajoritario: number;
}

export interface SubCorrespondenteResponse {
  id: string;
  nome: string;
  cpfMascarado: string;
  email: string;
  telefone: string;
  status: StatusSub;
  criadoEm: string;
  clientesNaBase: number;
  valorCarteira: number;
  valorEmAtraso: number;
  inadimplenciaPct: number;
  /** Comissao do sub (prevista + disponivel + paga), pelos percentuais dele. */
  comissaoDoSub: number;
  /** O que o majoritario ganha em cima da producao do sub: a margem. */
  margemDoMajoritario: number;
  percentuais: PercentualSub[];
}

export interface TetoComissaoSub {
  produto: string;
  base: BaseComissao;
  percentualSep: number;
  tetoSub: number;
}

export interface ConsolidadoDaRede {
  /** Clientes da base propria + os dos subs. */
  clientes: number;
  clientesProprios: number;
  valorCarteira: number;
  valorEmAtraso: number;
  inadimplenciaPct: number;
  /** Comissao pela regra do SEP sobre toda a producao da rede. */
  comissaoBruta: number;
  /** Parte repassada aos subs. */
  repasseAosSubs: number;
  /** O que fica com o majoritario: bruta - repasse. */
  comissaoLiquida: number;
}

export interface RedeDoMajoritarioResponse {
  majoritarioId: string;
  subs: SubCorrespondenteResponse[];
  tetos: TetoComissaoSub[];
  consolidado: ConsolidadoDaRede;
}

export interface PercentualSubRequest {
  produto: string;
  percentualSub: number;
}

export interface CriarSubRequest {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  percentuais: PercentualSubRequest[];
}

export interface AtualizarPercentuaisSubRequest {
  percentuais: PercentualSubRequest[];
  justificativa: string;
}

/** A quem pertence a operacao de uma carteira consolidada. */
export type OrigemDaOperacao = 'PROPRIA' | 'SUB';

export interface OperacaoDaRedeResponse {
  origem: OrigemDaOperacao;
  subId: string | null;
  subNome: string | null;
  operacao: import('./correspondentes.models').OperacaoClienteResponse;
}

export interface ComissaoPorOrigem {
  origem: OrigemDaOperacao;
  subId: string | null;
  subNome: string;
  /** Pela regra do SEP. */
  bruta: number;
  /** Parte do sub (zero na carteira propria). */
  repasse: number;
  /** Parte do majoritario. */
  liquida: number;
}

export interface ComissaoDaRedeResponse {
  porOrigem: ComissaoPorOrigem[];
  totalBruta: number;
  totalRepasse: number;
  totalLiquida: number;
}

/** O que o proprio sub ve: o majoritario dele e os percentuais que ele recebe, sem os dos outros subs. */
export interface MinhaPosicaoNaRedeResponse {
  nivel: NivelCorrespondente;
  majoritarioNome: string | null;
  percentuais: PercentualSub[];
}
