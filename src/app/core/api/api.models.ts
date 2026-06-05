// Modelos alinhados ao PRD §21 (contratos iniciais dos endpoints) e Sprint 5
// (MFA TOTP + refresh rotativo + step-up).
// Usados por AuthService, MfaService e demais features que consomem a API SEP.

export type UsuarioRole = 'ADMIN' | 'CLIENTE';

export interface UsuarioResponse {
  id: string;
  username: string;
  role: UsuarioRole;
  dataCriacao: string;
  dataModificacao: string;
  criadoPor: string;
  modificadoPor: string;
  // Sprint 5: flags de seguranca propagadas pela API.
  precisaRedefinirSenha: boolean;
  mfaHabilitado: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string | null;
  tokenType: 'Bearer';
  expiresIn: number;
  refreshToken: string | null;
  usuario: UsuarioResponse | null;
  // Sprint 5: quando MFA esta ativo, login devolve apenas mfaChallengeId.
  mfaRequired: boolean;
  mfaChallengeId: string | null;
}

// 5F-FIX-02: refresh/logout web nao enviam body — refresh token vive em cookie
// HttpOnly anexado pelo browser (clientChannelInterceptor faz withCredentials).
// Interfaces antigas RefreshTokenRequest/LogoutRequest removidas.

export interface TotpSetupResponse {
  secretBase32: string;
  otpAuthUri: string;
  qrCodeDataUrl: string;
  backupCodes: string[];
}

export interface TotpConfirmRequest {
  codigo: string;
}

export interface TotpVerifyRequest {
  mfaChallengeId: string;
  codigo: string;
}

export interface TotpDisableRequest {
  passwordAtual: string;
}

export interface StepUpInitiateResponse {
  stepUpChallengeId: string;
}

export interface StepUpCompleteRequest {
  stepUpChallengeId: string;
  codigo: string;
}

export interface StepUpCompleteResponse {
  stepUpToken: string;
}

export interface UsuarioCreateRequest {
  username: string;
  password: string;
  // 5F-FIX-01: cadastro publico sempre cria CLIENTE; role e ignorado pelo backend
  // mesmo quando enviado. Mantido opcional para compat com chamadas legadas.
  role?: UsuarioRole;
}

export interface UsuarioSenhaUpdateRequest {
  passwordAtual: string;
  novaSenha: string;
}

export interface ApiErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  traceId?: string;
}

// --- Onboarding KYC PF / KYB PJ (F-Sprint 6) ---
// DTOs de borda espelhando os contratos reais de `sep-api` (onboarding Sprints 6-7).
// Status e decisoes KYC/KYB/PLD pertencem ao backend: o frontend nao interpreta esses
// valores como regra de negocio, apenas os apresenta.

export type StatusOnboarding =
  | 'INICIADO'
  | 'DOCUMENTOS_RECEBIDOS'
  | 'EM_VERIFICACAO'
  | 'APROVADO'
  | 'REPROVADO'
  | 'PENDENCIA'
  | 'APROVADO_FINAL'
  | 'REPROVADO_PLD';

export type TipoDocumento =
  | 'RG'
  | 'CNH'
  | 'PASSAPORTE'
  | 'SELFIE'
  | 'CONTRATO_SOCIAL'
  | 'CCMEI'
  | 'COMPROVANTE_ENDERECO';

export type TipoSocietario = 'LTDA' | 'SA' | 'EIRELI' | 'MEI' | 'OUTROS';

export type PorteEmpresa = 'MEI' | 'ME' | 'EPP' | 'MEDIO' | 'GRANDE';

export type StatusPldRepresentante = 'PENDENTE' | 'LIMPO' | 'HIT';

export interface IniciarOnboardingPessoaRequest {
  cpf: string;
  nomeCompleto: string;
  dataNascimento: string; // yyyy-MM-dd
}

export interface IniciarOnboardingEmpresaRequest {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  tipoSocietario?: TipoSocietario;
  porte?: PorteEmpresa;
}

export interface OnboardingResponse {
  id: string;
  status: StatusOnboarding;
  dataCriacao: string;
  dataModificacao: string;
}

export interface EmpresaResponse {
  id: string;
  status: StatusOnboarding;
  cnpj: string;
  razaoSocial: string;
  dataCriacao: string;
  dataModificacao: string;
}

export interface DocumentoEnviadoResponse {
  id: string;
  tipo: TipoDocumento;
  dataEnvio: string;
  sha256: string;
}

export interface ResultadoOnboardingResponse {
  statusFinal: StatusOnboarding;
  motivo: string | null;
  dataResultado: string;
}

export interface StatusOnboardingResponse {
  id: string;
  status: StatusOnboarding;
  dataCriacao: string;
  dataModificacao: string;
  documentosEnviados: DocumentoEnviadoResponse[];
  resultado: ResultadoOnboardingResponse | null;
}

// Resumo publico do PLD: apenas status consolidado + data. Backend nunca expoe
// motivo/base/severidade nesta camada (LGPD Art. 16).
export interface ConsultaPldResumoResponse {
  statusPld: StatusPldRepresentante;
  dataConsulta: string | null;
}

// CPF do representante chega sempre mascarado pelo backend; o web nunca recebe CPF completo.
export interface RepresentanteLegalResponse {
  id: string;
  nome: string;
  cpfMascarado: string;
  cargo: string;
  pld: ConsultaPldResumoResponse | null;
}

export interface DadosEmpresaResponse {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  tipoSocietario: TipoSocietario | null;
  porte: PorteEmpresa | null;
}

export interface StatusOnboardingEmpresaResponse {
  id: string;
  status: StatusOnboarding;
  dataCriacao: string;
  dataModificacao: string;
  dadosEmpresa: DadosEmpresaResponse;
  documentosEnviados: DocumentoEnviadoResponse[];
  representantes: RepresentanteLegalResponse[];
  resultado: ResultadoOnboardingResponse | null;
}

// --- Credito e Open Finance (F-Sprint 7) ---
// DTOs de borda espelhando os contratos reais de `sep-api` (credito Sprints 8-9).
// Score, status de proposta, parecer e decisao de Open Finance pertencem ao backend:
// o frontend nao calcula score, elegibilidade nem decisao final, apenas apresenta.

export type StatusProposta = 'EM_ANALISE' | 'PRE_APROVADA' | 'APROVADA' | 'REJEITADA' | 'PENDENCIA';

export type TipoOperacao = 'CAPITAL_GIRO' | 'OUTROS';

export type StatusConsentimento = 'PENDENTE' | 'AUTORIZADO' | 'NEGADO' | 'EXPIRADO';

export type DecisaoParecer = 'APROVAR' | 'REJEITAR' | 'PENDENCIA';

export type ResultadoRegra = 'PASSOU' | 'FALHOU' | 'PENDENTE';

export interface CriarPropostaRequest {
  solicitacaoOnboardingId: string;
  tipoOperacao: TipoOperacao;
  valorSolicitado: number;
  prazoMeses: number;
}

// Score do motor de credito: informativo. O frontend nunca recalcula.
export interface ScoreInternoResponse {
  valor: number;
  statusSugerido: StatusProposta;
  falhas: number;
  pendencias: number;
  dataCalculo: string;
}

export interface ParecerCreditoResponse {
  id: string;
  propostaId: string;
  pareceristaId: string;
  decisao: DecisaoParecer;
  justificativa: string;
  scoreMotorSnapshot: number | null;
  versao: number;
  dataParecer: string;
}

export interface PropostaResponse {
  id: string;
  tomadorId: string;
  solicitacaoOnboardingId: string;
  tipoOperacao: TipoOperacao;
  valorSolicitado: number;
  moeda: string;
  prazoMeses: number;
  status: StatusProposta;
  dataCriacao: string;
  dataModificacao: string;
  score: ScoreInternoResponse | null;
  parecer: ParecerCreditoResponse | null;
}

// Trilha auditavel de regras do motor — exibida apenas a FINANCEIRO/ADMIN.
export interface RegraAvaliadaResponse {
  nomeRegra: string;
  resultado: ResultadoRegra;
  motivo: string;
  bloqueante: boolean;
  dataAvaliacao: string;
}

export interface IniciarConsentimentoOpenFinanceRequest {
  cpfCnpjTomador: string;
  redirectUri: string;
}

export interface IniciarConsentimentoOpenFinanceResponse {
  consentimentoId: string;
  status: StatusConsentimento;
  urlAutorizacao: string;
  dataExpiracao: string;
}

// Snapshot consolidado de movimentacao bancaria: apenas agregados (LGPD).
// Nunca transacoes, conta, agencia, titular ou identificadores bancarios.
export interface MovimentacaoConsolidadaResponse {
  mediaEntradasMensal: number;
  mediaSaidasMensal: number;
  saldoMedio: number;
  numeroMesesAvaliados: number;
  dataRecebimento: string;
}

export interface OpenFinanceStatusResponse {
  statusConsentimento: StatusConsentimento;
  dataInicio: string;
  dataAutorizacao: string | null;
  dataExpiracao: string | null;
  ultimaMovimentacao: MovimentacaoConsolidadaResponse | null;
}

// Formato Spring Page (`Page<T>`) consumido na listagem de propostas.
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

// --- Formalizacao contratual (F-Sprint 8 / backend Sprints 10-11) ---
// Modelos fieis aos DTOs de `contratos.web.dto`. Sao DTOs de borda: nao carregam
// regra de negocio. Versionamento, hashes, assinatura provider e transicoes de
// estado pertencem ao backend.

export type StatusFormalizacao =
  | 'GERADO'
  | 'AGUARDANDO_ACEITE'
  | 'ACEITO'
  | 'EM_ASSINATURA'
  | 'ASSINADO'
  | 'RECUSADO'
  | 'CANCELADO';

export type StatusEnvelope =
  | 'RASCUNHO'
  | 'ENVIADO'
  | 'VISUALIZADO'
  | 'ASSINADO'
  | 'RECUSADO'
  | 'EXPIRADO';

export type TipoContrato = 'MUTUO' | 'CCB' | 'OUTROS';

export interface ClausulaContratoResponse {
  id: string;
  ordem: number;
  titulo: string;
  texto: string;
}

export interface VersaoContratoResponse {
  id: string;
  numero: number;
  conteudoTexto: string;
  hashSha256: string;
  dataGeracao: string;
  parecerOrigemId: string | null;
  clausulas: ClausulaContratoResponse[];
}

export interface AceiteContratoResponse {
  id: string;
  versaoId: string;
  tomadorId: string;
  dataAceite: string;
  ipOrigem: string;
  userAgentOrigem: string;
}

export interface ContratoResponse {
  id: string;
  propostaId: string;
  tomadorId: string;
  tipo: TipoContrato;
  status: StatusFormalizacao;
  versaoVigente: VersaoContratoResponse | null;
  aceite: AceiteContratoResponse | null;
  dataCriacao: string;
  dataModificacao: string;
}

export interface StatusAssinaturaResponse {
  statusContrato: StatusFormalizacao;
  statusEnvelope: StatusEnvelope | null;
  idEnvelopeExterno: string | null;
  dataAtualizacaoProvider: string | null;
}

// --- Cobranca (F-Sprint 9 / backend Sprints 12-13) ---
// DTOs de borda fieis a `cobranca.web.dto`. Calculo de saldo, mora, multa, status e
// transicoes pertence ao backend; estes modelos nao carregam regra de negocio nem
// metodo calculado. Datas como string ISO; valores monetarios como number apenas
// para exibicao.

export type StatusParcela =
  | 'PENDENTE'
  | 'PARCIALMENTE_PAGA'
  | 'PAGA'
  | 'ATRASADA'
  | 'INADIMPLENTE'
  | 'EM_NEGOCIACAO'
  | 'RENEGOCIADA';

export type StatusRenegociacao = 'PROPOSTA' | 'ACEITA' | 'RECUSADA' | 'EXPIRADA';

export type TipoEventoCobranca =
  | 'NOTIFICACAO_AUTOMATICA'
  | 'CONTATO_MANUAL'
  | 'RENEGOCIACAO_PROPOSTA'
  | 'RENEGOCIACAO_ACEITA'
  | 'RENEGOCIACAO_RECUSADA'
  | 'RENEGOCIACAO_EXPIRADA'
  | 'PARCELA_INADIMPLENTE';

export type CanalNotificacao = 'EMAIL' | 'SMS';

export type StatusEventoCobranca = 'SUCESSO' | 'FALHA';

// Composicao estatica da parcela como vem dentro da agenda. O valor atualizado por
// mora/multa nao aparece aqui — apenas em ValorAtualizadoParcelaResponse.
export interface ParcelaResponse {
  id: string;
  numero: number;
  principal: number;
  juros: number;
  multa: number;
  encargos: number;
  total: number;
  dataVencimento: string;
  status: StatusParcela;
}

export interface AgendaPagamentoResponse {
  id: string;
  contratoId: string;
  numeroParcelas: number;
  valorTotal: number;
  dataGeracao: string;
  parcelas: ParcelaResponse[];
}

// Snapshot do valor atualizado da parcela contra 'agora', calculado no backend.
export interface ValorAtualizadoParcelaResponse {
  parcelaId: string;
  numero: number;
  status: StatusParcela;
  dataVencimento: string;
  principalOriginal: number;
  jurosOriginal: number;
  jurosMora: number;
  multa: number;
  valorDevidoAtualizado: number;
  totalRecebido: number;
  valorEmAberto: number;
}

export interface RegistrarRecebimentoRequest {
  valorRecebido: number;
  dataRecebimento: string;
  meioPagamento: string;
  identificadorExterno?: string;
  observacao?: string;
}

// `novo`=false quando a idempotencia retorna o recebimento original.
export interface RecebimentoResponse {
  recebimentoId: string;
  parcelaId: string;
  statusParcela: StatusParcela;
  valorRecebido: number;
  dataRecebimento: string;
  meioPagamento: string;
  identificadorExterno: string | null;
  movimentacaoEscrowId: string | null;
  novo: boolean;
}

export interface InadimplenciaResponse {
  parcelaId: string;
  agendaId: string;
  contratoId: string;
  tomadorId: string;
  numeroParcela: number;
  status: StatusParcela;
  dataVencimento: string;
  diasAtraso: number;
  valorOriginal: number;
}

export interface RegistrarContatoRequest {
  descricao: string;
  diasAtraso?: number;
}

// Evento operacional de cobranca. Para contato manual, `canal` e `template` vem null.
export interface EventoCobrancaResponse {
  id: string;
  parcelaId: string;
  tipo: TipoEventoCobranca;
  canal: CanalNotificacao | null;
  template: string | null;
  status: StatusEventoCobranca;
  diasAtraso: number | null;
  descricao: string | null;
  registradoPor: string | null;
  dataEvento: string;
}

export interface IniciarRenegociacaoRequest {
  novoValorParcela: number;
  novoVencimento: string;
  numeroParcelas: number;
  desconto: number;
  justificativa: string;
}

export interface RenegociacaoResponse {
  id: string;
  parcelaOriginalId: string;
  agendaOriginalId: string;
  tomadorId: string;
  status: StatusRenegociacao;
  statusParcelaAnterior: StatusParcela;
  novoValorParcela: number;
  novoVencimento: string;
  numeroParcelas: number;
  desconto: number;
  propostaPor: string;
  dataProposta: string;
  dataExpiracao: string;
  dataDecisao: string | null;
  agendaSubstitutaId: string | null;
}
