// Contratos do modulo de Correspondentes. Ainda nao ha endpoint no backend: estes tipos sao a
// proposta de contrato (docs/atualizacao-07102026) e hoje sao servidos pelo MSW. As regras de
// vigencia, perda de base e validacao pertencem ao backend; o front apresenta o estado recebido.

export type StatusCadastroCorrespondente =
  | 'PENDENTE'
  | 'ATIVO'
  | 'A_VENCER'
  | 'VENCIDO'
  | 'SUSPENSO'
  | 'INATIVO';

export type StatusVinculo = 'VIGENTE' | 'PERDIDO' | 'TRANSFERIDO' | 'DIRETO_SEP';

export type MotivoFimVinculo =
  | 'CADASTRO_VENCIDO'
  | 'PROPOSTA_SEM_CITACAO'
  | 'ELEICAO_CLIENTE'
  | 'TRANSFERENCIA_ADMIN';

export type StatusEnvioDocumentos = 'EM_VALIDACAO' | 'VALIDADO' | 'DEVOLVIDO';

export interface CorrespondenteResponse {
  id: string;
  nome: string;
  cpfMascarado: string;
  email: string;
  status: StatusCadastroCorrespondente;
  /** Fim da validade do cadastro (data, AAAA-MM-DD). */
  validadeCadastro: string;
  cadastroAtualizadoEm: string;
  diasParaVencer: number;
  clientesNaBase: number;
  envios: number;
  comissaoPrevista: number;
  /** Soma dos contratos ativos da base (valor contratado). */
  valorCarteira: number;
  valorEmAtraso: number;
  /** Parcelas vencidas sobre as parcelas ja devidas, em %. */
  inadimplenciaPct: number;
}

export interface VinculoResponse {
  id: string;
  correspondenteId: string | null;
  correspondenteNome: string | null;
  clienteNome: string;
  clienteDocumentoMascarado: string;
  status: StatusVinculo;
  inicio: string;
  fim: string | null;
  motivoFim: MotivoFimVinculo | null;
  /** Ultima proposta assinada citou o correspondente? null = cliente ainda sem proposta. */
  ultimaPropostaCitaCorrespondente: boolean | null;
}

export interface DocumentoEnvio {
  tipo: string;
  nomeArquivo: string;
}

export interface EnvioDocumentosResponse {
  id: string;
  correspondenteId: string;
  correspondenteNome: string;
  clienteNome: string;
  enviadoEm: string;
  documentos: DocumentoEnvio[];
  /** Atesto do correspondente de que os documentos conferem com os originais. */
  atestoConferencia: boolean;
  status: StatusEnvioDocumentos;
  observacaoBackoffice: string | null;
}

export type SituacaoOperacao =
  | 'EM_ANALISE'
  | 'EM_FORMALIZACAO'
  | 'EM_DIA'
  | 'EM_ATRASO'
  | 'QUITADO'
  | 'RECUSADA';

export type StatusParcela = 'PAGA' | 'A_VENCER' | 'VENCIDA';

export interface ParcelaContrato {
  numero: number;
  vencimento: string;
  valor: number;
  status: StatusParcela;
  pagoEm: string | null;
  diasAtraso: number;
}

/**
 * Proposta ou contrato de um cliente da base. O correspondente acompanha o que captou: situacao,
 * parcelas e atraso. Nao traz score, renda nem parecer de credito.
 */
export interface OperacaoClienteResponse {
  id: string;
  numero: string;
  tipo: 'PROPOSTA' | 'CONTRATO';
  clienteNome: string;
  clienteDocumentoMascarado: string;
  produto: string;
  situacao: SituacaoOperacao;
  valorContratado: number;
  valorParcela: number;
  totalParcelas: number;
  parcelasPagas: number;
  parcelasVencidas: number;
  valorPago: number;
  valorEmAtraso: number;
  saldoAReceber: number;
  proximoVencimento: string | null;
  contratadoEm: string | null;
  parcelas: ParcelaContrato[];
}

export interface RecebimentoMes {
  /** AAAA-MM */
  mes: string;
  valor: number;
}

export interface CarteiraResumo {
  contratosAtivos: number;
  valorContratado: number;
  valorEmAtraso: number;
  saldoAReceber: number;
  parcelasPagas: number;
  parcelasEmDia: number;
  parcelasVencidas: number;
  inadimplenciaPct: number;
  porSituacao: Record<SituacaoOperacao, number>;
  aReceberPorMes: RecebimentoMes[];
}

export interface ResumoCorrespondenteResponse {
  correspondente: CorrespondenteResponse;
  carteira: CarteiraResumo;
  vinculosVigentes: number;
  vinculosPerdidos: number;
  enviosEmValidacao: number;
  enviosValidados: number;
  enviosDevolvidos: number;
}

export interface RedeResumoResponse {
  correspondentes: CorrespondenteResponse[];
  totalClientesNaBase: number;
  totalClientesDiretoSep: number;
  cadastrosAVencer: number;
  cadastrosVencidos: number;
  enviosEmValidacao: number;
}

export interface EnviarDocumentosRequest {
  clienteNome: string;
  documentos: DocumentoEnvio[];
  atestoConferencia: boolean;
}

export interface RenovarCadastroRequest {
  novaValidade: string;
}

export interface ReatribuirVinculoRequest {
  /** null = cliente passa a operar direto com o SEP. */
  correspondenteDestinoId: string | null;
}

export interface ValidarEnvioRequest {
  decisao: 'VALIDAR' | 'DEVOLVER';
  observacao: string;
}

export interface ProcessarVigenciaResponse {
  vinculosEncerrados: number;
  correspondentesAfetados: string[];
}
