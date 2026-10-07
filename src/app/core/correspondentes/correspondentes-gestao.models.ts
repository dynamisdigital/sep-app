// Contratos da gestao comercial do modulo de Correspondentes: funil de prospeccao, agenda de
// relacionamento, comissoes, metas, desempenho e auditoria. Proposta de contrato: ainda nao ha
// endpoint no backend, e hoje tudo e servido pelo MSW (ver docs/atualizacao-07102026).

// ---- Funil de prospeccao ----

export type EtapaFunil =
  | 'PROSPECTADO'
  | 'CONTATADO'
  | 'EM_NEGOCIACAO'
  | 'DOCUMENTACAO'
  | 'ANALISE_CREDITO'
  | 'APROVADO'
  | 'CONTRATADO'
  | 'ATIVO'
  | 'PERDIDO';

/** Ordem do funil, da captacao ao cliente ativo. PERDIDO fica fora do fluxo. */
export const ETAPAS_FUNIL: readonly EtapaFunil[] = [
  'PROSPECTADO',
  'CONTATADO',
  'EM_NEGOCIACAO',
  'DOCUMENTACAO',
  'ANALISE_CREDITO',
  'APROVADO',
  'CONTRATADO',
  'ATIVO',
];

export interface ProspectResponse {
  id: string;
  nome: string;
  tipoPessoa: 'PF' | 'PJ';
  telefone: string;
  produtoInteresse: string;
  valorEstimado: number;
  etapa: EtapaFunil;
  origem: string;
  criadoEm: string;
  atualizadoEm: string;
  proximoContato: string | null;
  motivoPerda: string | null;
}

export interface CriarProspectRequest {
  nome: string;
  tipoPessoa: 'PF' | 'PJ';
  telefone: string;
  produtoInteresse: string;
  valorEstimado: number;
}

export interface MoverEtapaRequest {
  etapa: EtapaFunil;
  motivoPerda?: string;
}

// ---- Agenda e relacionamento ----

export type TipoInteracao =
  | 'LIGACAO'
  | 'WHATSAPP'
  | 'VISITA'
  | 'REUNIAO'
  | 'OBSERVACAO'
  | 'RETORNO'
  | 'PENDENCIA_DOCUMENTAL';

export type StatusInteracao = 'REGISTRADA' | 'AGENDADA' | 'CONCLUIDA' | 'ATRASADA';

export interface InteracaoResponse {
  id: string;
  /** Prospect ou cliente a que se refere; texto livre quando e cliente da base. */
  clienteNome: string;
  prospectId: string | null;
  tipo: TipoInteracao;
  descricao: string;
  /** Quando aconteceu (registrada) ou quando esta marcada (agendada), AAAA-MM-DD. */
  data: string;
  status: StatusInteracao;
}

export interface CriarInteracaoRequest {
  clienteNome: string;
  tipo: TipoInteracao;
  descricao: string;
  data: string;
  agendar: boolean;
}

// ---- Comissoes ----

export type BaseComissao = 'VALOR_LIBERADO' | 'PARCELA_RECEBIDA';
export type EventoComissao = 'ORIGINACAO' | 'PARCELA_RECEBIDA' | 'ESTORNO';
export type StatusComissao = 'PREVISTA' | 'DISPONIVEL' | 'PAGA' | 'ESTORNADA';

/** Regra configuravel (nunca no codigo): produto, base de calculo e percentual, com versao. */
export interface RegraComissao {
  id: string;
  produto: string;
  base: BaseComissao;
  percentual: number;
  gatilhoPagamento: string;
  versao: number;
  vigenteDesde: string;
  atualizadoPor: string;
}

export interface AtualizarRegraRequest {
  percentual: number;
  justificativa: string;
}

export interface LancamentoComissao {
  id: string;
  correspondenteId: string;
  correspondenteNome: string;
  clienteNome: string;
  contratoNumero: string;
  evento: EventoComissao;
  /** Competencia AAAA-MM. */
  competencia: string;
  baseCalculo: number;
  percentual: number;
  valor: number;
  status: StatusComissao;
  pagoEm: string | null;
  regraVersao: number;
}

export interface ComissoesResponse {
  acumulada: number;
  prevista: number;
  disponivel: number;
  paga: number;
  estornada: number;
  porMes: { mes: string; valor: number }[];
  lancamentos: LancamentoComissao[];
}

// ---- Metas e desempenho ----

export interface MetaCorrespondente {
  correspondenteId: string;
  periodo: string;
  metaClientes: number;
  metaValorOriginado: number;
  realizadoClientes: number;
  realizadoValorOriginado: number;
  atingimentoClientesPct: number;
  atingimentoValorPct: number;
}

export interface AtualizarMetaRequest {
  metaClientes: number;
  metaValorOriginado: number;
}

export interface DesempenhoCorrespondente {
  correspondenteId: string;
  nome: string;
  clientesCaptados: number;
  prospects: number;
  contratados: number;
  taxaConversaoPct: number;
  valorOriginado: number;
  contratos: number;
  carteiraAtiva: number;
  inadimplenciaPct: number;
  comissaoGerada: number;
  comissaoPaga: number;
  atingimentoMetaPct: number;
  posicao: number;
}

export interface DesempenhoRedeResponse {
  ranking: DesempenhoCorrespondente[];
  metas: MetaCorrespondente[];
}

export interface MeuDesempenhoResponse {
  meu: DesempenhoCorrespondente;
  meta: MetaCorrespondente;
  totalCorrespondentes: number;
}

// ---- Auditoria ----

export type AcaoAuditoria =
  | 'CADASTRO_RENOVADO'
  | 'VINCULO_REATRIBUIDO'
  | 'VINCULO_ENCERRADO'
  | 'ENVIO_CRIADO'
  | 'ENVIO_VALIDADO'
  | 'ENVIO_DEVOLVIDO'
  | 'REGRA_COMISSAO_ALTERADA'
  | 'META_ALTERADA'
  | 'PROSPECT_CRIADO'
  | 'PROSPECT_MOVIDO'
  | 'INTERACAO_REGISTRADA';

export interface EventoAuditoria {
  id: string;
  quando: string;
  ator: string;
  papel: string;
  acao: AcaoAuditoria;
  entidade: string;
  entidadeId: string;
  /** Resumo legivel, com valor anterior e novo quando houver. */
  detalhe: string;
}
