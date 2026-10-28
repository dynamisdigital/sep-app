// Contratos do Pix Automatico no Credito: o debito recorrente das parcelas, autorizado pelo tomador no
// aplicativo do proprio banco. Ainda nao ha endpoint no backend: estes tipos sao a proposta de contrato
// (docs/atualizacao-07102026/VIABILIDADE_PIX_AUTOMATICO.md) e hoje sao servidos pelo MSW.
//
// Nao confundir com o "Pix Agendado": este e um pagamento unico, marcado pelo pagador. O que serve a
// parcelas e a recorrencia do Pix Automatico (regulamento do Pix, BCB), em que o recebedor — o SEP —
// cria a recorrencia, o tomador a autoriza no banco dele e cada cobranca e enviada e liquidada pela
// instituicao participante. O SEP guarda a autorizacao e acompanha as cobrancas; nunca a senha, o token
// ou o saldo do tomador.

export type TipoConta = 'CORRENTE' | 'POUPANCA' | 'PAGAMENTO';

/** PENDENTE_PAGADOR: enviada ao banco do tomador, aguardando o aceite dele. So ATIVA gera cobrancas. */
export type StatusAutorizacaoPix = 'PENDENTE_PAGADOR' | 'ATIVA' | 'REJEITADA' | 'REVOGADA';

export type StatusDebitoPix = 'AGENDADO' | 'NOTIFICADO' | 'LIQUIDADO' | 'FALHOU' | 'CANCELADO';

export interface ParametrosPixAutomatico {
  /** Chave geral: desligada, nenhum contrato novo e habilitado e nenhuma cobranca nova e agendada. */
  habilitado: boolean;
  /** O pagador precisa ser avisado entre 2 e 10 dias antes do vencimento (regra do BCB). */
  antecedenciaNotificacaoDias: number;
  /** Reapresentacoes apos a falha da cobranca, dentro da janela permitida. */
  maxTentativas: number;
  /** Maior valor de uma cobranca; alinhado ao teto do regimento por operacao. */
  valorMaximoPorDebito: number;
}

export interface PagadorPix {
  nome: string;
  /** CPF ou CNPJ; o backend guarda inteiro e devolve mascarado. */
  documento: string;
  /** Identificador da instituicao do pagador no SPI (8 digitos). */
  ispb: string;
  banco: string;
  agencia: string;
  conta: string;
  tipoConta: TipoConta;
}

export interface PagadorPixResponse extends Omit<PagadorPix, 'documento' | 'conta'> {
  documentoMascarado: string;
  contaMascarada: string;
}

export interface AutorizacaoPixResponse {
  id: string;
  contratoId: string;
  contratoCurto: string;
  produto: string;
  status: StatusAutorizacaoPix;
  pagador: PagadorPixResponse;
  /** Identificador da recorrencia no Pix Automatico, atribuido pelo banco do recebedor. */
  idRecorrencia: string | null;
  /** Dia do mes em que a cobranca vence (o do vencimento da parcela). */
  diaDebito: number;
  /** Limite autorizado pelo tomador por cobranca. */
  valorMaximo: number;
  criadaEm: string;
  ativadaEm: string | null;
  revogadaEm: string | null;
  motivo: string | null;
}

export interface CriarAutorizacaoPixRequest {
  contratoId: string;
  pagador: PagadorPix;
  /** Confirmacao de que o tomador foi informado e consentiu (LGPD); o aceite real e dado no banco dele. */
  consentimento: boolean;
}

export interface DebitoPixResponse {
  parcela: string;
  vencimento: string;
  valor: number;
  status: StatusDebitoPix;
  /** Dia em que o pagador foi avisado da cobranca. */
  notificadoEm: string | null;
  tentativas: number;
  motivo: string | null;
}

export interface ResumoPixAutomatico {
  autorizacoesAtivas: number;
  pendentes: number;
  debitosNoMes: number;
  valorAgendado: number;
  /** Cobrancas liquidadas sobre as que ja tiveram desfecho (liquidada ou falha); null sem historico. */
  taxaSucessoPct: number | null;
}
