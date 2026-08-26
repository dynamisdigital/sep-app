// Modelos alinhados ao PRD §21 (contratos iniciais dos endpoints) e Sprint 5
// (MFA TOTP + refresh rotativo + step-up).
// Usados por AuthService, MfaService e demais features que consomem a API SEP.

// Role principal (denormalizada) retornada pelo backend no login/me. O backend
// suporta roles cumulativas (Set), mas expoe ao web apenas a de maior precedencia
// (ADMIN > FINANCEIRO > BACKOFFICE > CLIENTE). FINANCEIRO/BACKOFFICE sao perfis
// operacionais internos usados a partir da jornada de cobranca (F-Sprint 9).
export type UsuarioRole = 'ADMIN' | 'CLIENTE' | 'FINANCEIRO' | 'BACKOFFICE';

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

/**
 * Politica de lockout vigente (`GET /auth/politica-lockout`, backend Sprint 34). Publico: quem
 * precisa do valor esta bloqueado e, por definicao, nao tem sessao.
 *
 * `windowMinutes` e `lockoutMinutes` estao em MINUTOS — nao segundos, nao millis. O aviso nao e
 * decorativo: o header `Retry-After` da mesma feature vem em SEGUNDOS, e nenhum dos dois nomes
 * denuncia a unidade.
 *
 * O springdoc nao emite `required` neste schema, entao o contrato NAO garante os tres campos; quem
 * consome valida na borda (ver `PoliticaLockoutService`).
 */
export interface PoliticaLockoutResponse {
  maxAttempts: number;
  windowMinutes: number;
  lockoutMinutes: number;
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

// Visao publica owner-scoped da renegociacao ativa (backend Sprint 24). Contem apenas os
// dez campos expostos ao tomador; `valorTotalRenegociado` ja vem calculado pelo backend e
// nao deve ser derivado no front. Distinto do `RenegociacaoResponse` interno das mutacoes.
export interface RenegociacaoTomadorResponse {
  renegociacaoId: string;
  parcelaId: string;
  status: StatusRenegociacao;
  novoValorParcela: number;
  numeroParcelas: number;
  valorTotalRenegociado: number;
  novoVencimento: string;
  desconto: number;
  dataProposta: string;
  dataExpiracao: string;
}

// --- Backoffice e financeiro operacional (F-Sprint 10 / backend Sprint 14 + Pix 20-21) ---
// DTOs de borda fieis a `backoffice.web.dto`. Transicoes de status, validacao de estado,
// audit trail, anti-abuso e autorizacao real pertencem ao backend; estes modelos nao
// carregam regra de negocio nem metodo calculado para SLA, prioridade ou permissao de
// transicao. Datas como string ISO; valores monetarios como number apenas para exibicao.

export type TipoItemFila =
  | 'ONBOARDING_PENDENTE'
  | 'ONBOARDING_ERRO'
  | 'PROPOSTA_PENDENTE'
  | 'CONTRATO_NAO_ASSINADO'
  | 'COBRANCA_INADIMPLENTE'
  | 'WEBHOOK_FALHOU'
  | 'DESEMBOLSO_PIX_FALHOU'
  | 'RECEBIMENTO_PIX_DIVERGENTE'
  | 'OUTRO';

export type PrioridadeItem = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type StatusItemFila = 'ABERTO' | 'EM_TRATAMENTO' | 'RESOLVIDO' | 'IGNORADO';

export type TipoEntidadeReferenciada =
  | 'ONBOARDING'
  | 'PROPOSTA'
  | 'CONTRATO'
  | 'PARCELA_COBRANCA'
  | 'WEBHOOK_EVENT_LOG'
  | 'PIX_TRANSFERENCIA'
  | 'PIX_RECEBIMENTO'
  | 'OUTRO';

// Categorias de reprocesso de provider. PIX_TRANSFERENCIA tem handler real (reconsulta de
// status); KYC/KYB/PLD/OPEN_FINANCE/ASSINATURA_DIGITAL podem ser stubs no backend — a UI
// nao deve prometer retentativa real quando o backend nao garante.
export type TipoChamadaProvider =
  | 'KYC'
  | 'KYB'
  | 'PLD'
  | 'OPEN_FINANCE'
  | 'ASSINATURA_DIGITAL'
  | 'PIX_TRANSFERENCIA';

export type StatusReprocesso = 'PENDENTE' | 'SUCESSO' | 'FALHA';

export type TipoReprocesso = 'WEBHOOK' | 'PROVIDER';

export interface ItemFilaResponse {
  id: string;
  tipo: TipoItemFila;
  prioridade: PrioridadeItem;
  status: StatusItemFila;
  tipoEntidade: TipoEntidadeReferenciada;
  entidadeId: string;
  titulo: string;
  atribuidoA: string | null;
  dataAbertura: string;
  dataResolucao: string | null;
}

export interface ComentarioInternoResponse {
  id: string;
  autorId: string;
  conteudo: string;
  dataCriacao: string;
}

export interface ObjetoOriginalResponse {
  tipoEntidade: TipoEntidadeReferenciada;
  entidadeId: string;
  status: string;
  descricaoCurta: string;
}

export interface ItemFilaDetalheResponse extends ItemFilaResponse {
  descricao: string;
  comentarios: ComentarioInternoResponse[];
  objetoOriginal: ObjetoOriginalResponse | null;
}

export interface ComentarioRequest {
  conteudo: string;
}

// Backend exige justificativa de 20 a 10000 caracteres em resolver/ignorar.
export interface ResolverRequest {
  justificativa: string;
}

export interface IgnorarRequest {
  justificativa: string;
}

// Body opcional dos reprocessos; quando informado, vincula o registro ao item da fila.
export interface ReprocessoRequest {
  itemId?: string;
}

export interface ReprocessoResponse {
  id: string;
  itemId: string | null;
  tipo: TipoReprocesso;
  // null em reprocesso de WEBHOOK; preenchido em reprocesso de PROVIDER.
  tipoChamada: TipoChamadaProvider | null;
  identificadorExterno: string;
  status: StatusReprocesso;
  resultado: string | null;
  dataDisparo: string;
  disparadoPor: string;
}

export interface ContadorPorTipo {
  tipo: TipoItemFila;
  total: number;
}

export interface ContadorPorPrioridade {
  prioridade: PrioridadeItem;
  total: number;
}

export interface ContadorPorStatus {
  status: StatusItemFila;
  total: number;
}

export interface ContadorPorStatusProposta {
  status: string;
  total: number;
}

export interface InadimplenciaConsolidada {
  valorTotal: number;
  numeroParcelas: number;
}

// Snapshot consolidado (GET /backoffice/dashboard, Cache-Control: no-store).
// tempoMedioResolucao30d e um Duration serializado como string ISO-8601 ("PT2H"): o
// JacksonAutoConfiguration do Spring Boot DESLIGA WRITE_DURATIONS_AS_TIMESTAMPS, entao o fio nunca
// leva numero. Medido na Sprint 34. O tipo aqui dizia `number` e o comentario afirmava o contrario
// do que o servidor faz — era a origem do `NaNmin` no KPI do dashboard, corrigido na F-24.4.
// `backoffice-format.ts` parseia para exibicao.
export interface DashboardResponse {
  contadoresPorTipo: ContadorPorTipo[];
  contadoresPorPrioridade: ContadorPorPrioridade[];
  contadoresPorStatus: ContadorPorStatus[];
  tempoMedioResolucao30d: string;
  itensCriticosAbertosMais48h: number;
  topCincoTiposMaisFrequentes: ContadorPorTipo[];
  recebimentosDoDia: number;
  inadimplenciaTotal: InadimplenciaConsolidada;
  propostasPorStatus: ContadorPorStatusProposta[];
  geradoEm: string;
}

// --- Governanca: roles cumulativas + parametros operacionais (F-Sprint 12 / backend Sprint 18) ---
// Toda a area e ADMIN-only no backend. Precedencia de role, validacao de tipo, versionamento
// e auditoria ficam no backend; estes sao DTOs de borda, sem regra de negocio.

// Tipo do valor de um parametro operacional. O valor trafega como string; a interpretacao
// por tipo e responsabilidade da apresentacao, nao do modelo de borda.
export type TipoParametro = 'INTEGER' | 'DECIMAL' | 'BOOLEAN' | 'STRING';

// GET /usuarios/{id}/roles: conjunto cumulativo + a principal (maior precedencia), ambas
// resolvidas no backend. O DTO real nao expoe identificacao do usuario.
export interface UsuarioRolesResponse {
  roles: UsuarioRole[];
  principal: UsuarioRole;
}

// PUT /usuarios/{id}/roles: substitui o conjunto. Deve ser nao vazio (validado no backend).
export interface SubstituirRolesRequest {
  roles: UsuarioRole[];
}

// Item de GET /governanca/parametros e retorno de PATCH.
export interface ParametroOperacional {
  id: string;
  chave: string;
  tipo: TipoParametro;
  valor: string;
  descricao: string;
  ativo: boolean;
  versao: number;
  dataModificacao: string;
}

// Entrada do historico de alteracoes de um parametro. valorAnterior e nullable (a versao
// inicial nao tem valor anterior). ator identificado apenas por id (DTO real nao traz nome).
export interface VersaoParametro {
  versao: number;
  valorAnterior: string | null;
  valorNovo: string;
  atorId: string;
  justificativa: string;
  dataCriacao: string;
}

// GET /governanca/parametros/{chave}: detalhe + historico (mais recente primeiro).
export interface ParametroComHistorico {
  parametro: ParametroOperacional;
  historico: VersaoParametro[];
}

// PATCH /governanca/parametros/{chave}: novo valor + justificativa (ambos obrigatorios).
export interface AlterarParametroRequest {
  novoValor: string;
  justificativa: string;
}

// --- Pix operacional (F-Sprint 13 / backend Sprints 19-21) ---
// Borda de API do modulo pix do sep-api. O frontend so apresenta estado e dispara comandos
// autorizados; elegibilidade, idempotencia, conciliacao, escrow e provider ficam no backend.
// Tipos espelham os DTOs reais em pix.web.dto, sem campo calculado de conveniencia visual.

// Estados de uma transferencia Pix de desembolso (StatusPixTransferencia no backend).
export type StatusPixTransferencia =
  | 'CRIADA'
  | 'SOLICITADA'
  | 'PROCESSANDO'
  | 'CONCLUIDA'
  | 'FALHOU'
  | 'CANCELADA';

// Estados de uma referencia Pix de recebimento de parcela (StatusPixReferenciaRecebimento).
export type StatusPixReferenciaRecebimento =
  | 'ATIVA'
  | 'PAGA'
  | 'EXPIRADA'
  | 'CANCELADA'
  | 'DIVERGENTE';

// Estados de um recebimento Pix identificado por evento de provider (StatusPixRecebimento).
export type StatusPixRecebimento =
  | 'RECEBIDO'
  | 'EM_PROCESSAMENTO'
  | 'CONCILIADO'
  | 'NAO_IDENTIFICADO'
  | 'FALHOU';

// POST /pix/desembolsos: solicita desembolso assistido. A chave Pix em claro existe apenas
// aqui; nunca e persistida, logada ou reexibida. Exige Idempotency-Key (header) e step-up.
export interface SolicitarDesembolsoPixRequest {
  contratoId: string;
  valor: number;
  chavePixDestino: string;
}

// Resposta de POST /pix/desembolsos. novo=false quando o retorno e idempotente (transferencia
// ja existia). A chave destino so volta mascarada.
export interface PixDesembolsoResponse {
  transferenciaId: string;
  contratoId: string;
  status: StatusPixTransferencia;
  valor: number;
  chaveDestinoMascara: string;
  novo: boolean;
}

// Resposta de GET /pix/desembolsos/{id} (leitura local) e de POST /pix/desembolsos/{id}/status
// (reconciliacao no provider). providerIndisponivel=true quando o provider foi consultado mas
// falhou e o status local foi devolvido — nao e sucesso.
export interface PixStatusDesembolsoResponse {
  transferenciaId: string;
  contratoId: string;
  status: StatusPixTransferencia;
  valor: number;
  chaveDestinoMascara: string;
  providerIndisponivel: boolean;
}

// POST /pix/recebimentos/referencias: gera/reaproveita a referencia Pix de uma parcela.
export interface GerarReferenciaRecebimentoPixRequest {
  parcelaId: string;
}

// Resposta de POST /pix/recebimentos/referencias e GET /referencias/{id}. novo=false quando
// reaproveitada/consultada. codigoCopiaCola e o Pix copia-cola exposto pelo backend.
export interface PixReferenciaRecebimentoResponse {
  referenciaId: string;
  parcelaId: string;
  txid: string;
  codigoCopiaCola: string;
  valorEsperado: number;
  status: StatusPixReferenciaRecebimento;
  novo: boolean;
}

// GET /pix/recebimentos/{id}: recebimento conciliado ou divergente, exposto a papeis internos.
// Campos de vinculo/divergencia sao nullable: um recebimento NAO_IDENTIFICADO nao tem
// referencia/parcela/baixa, e motivoDivergencia so vem quando ha divergencia.
export interface PixRecebimentoResponse {
  recebimentoId: string;
  status: StatusPixRecebimento;
  valor: number;
  endToEndId: string | null;
  referenciaId: string | null;
  parcelaId: string | null;
  recebimentoCobrancaId: string | null;
  motivoDivergencia: string | null;
  recebidoEm: string;
}

// --- Chaves Pix da conta operacional (F-Sprint 20 / backend Sprint 31) ---
// Gestao assistida das chaves da conta operacional/escrow, restrita a FINANCEIRO/ADMIN. Tipo,
// digito verificador, unicidade, idempotencia e transicao de estado sao autoritativos no backend;
// o frontend nunca valida DV nem deriva status.

// Tipos de chave aceitos pelo backend (TipoChavePix), alinhados ao DICT.
export type TipoChavePix = 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'EVP';

// Ciclo de vida da chave (StatusChavePix). ATIVA -> INATIVA e a unica transicao; a remocao e
// logica e o historico nunca e apagado.
export type StatusChavePix = 'ATIVA' | 'INATIVA';

// POST /pix/chaves: o valor em claro existe SOMENTE nesta request (e na chamada do backend ao
// provider). Nunca aparece em resposta, leitura, log ou mensagem de erro.
export interface CadastrarChavePixRequest {
  tipo: TipoChavePix;
  valor: string;
}

// Resposta de POST /pix/chaves (201 novo / 200 replay idempotente) e item de GET /pix/chaves.
// valorMascarado e a unica forma pela qual a chave e exposta. removidaEm e nulo enquanto ATIVA.
export interface ChavePixResponse {
  id: string;
  tipo: TipoChavePix;
  valorMascarado: string;
  status: StatusChavePix;
  criadaEm: string;
  removidaEm: string | null;
}

// --- Credora (F-Sprint 11 / backend Sprints 16-17) ---
// DTOs de borda espelhando os contratos reais de `sep-api` (modulo credores). Elegibilidade,
// ownership, regras de interesse, associacao de carteira e auditoria pertencem ao backend: o
// frontend nunca recalcula elegibilidade nem deriva estado de interesse, apenas apresenta os DTOs.
// Datas chegam como string ISO (OffsetDateTime/LocalDate no backend); valores monetarios e taxas
// como number apenas para exibicao.

// Status cadastral da credora (StatusCredora no backend).
export type StatusCredora = 'CADASTRADA' | 'ATIVA' | 'SUSPENSA';

// Elegibilidade operacional derivada do onboarding PJ (StatusElegibilidade no backend).
export type StatusElegibilidade = 'PENDENTE' | 'ELEGIVEL' | 'INELEGIVEL';

// Natureza da credora (TipoCredora no backend).
export type TipoCredora = 'EMPRESA' | 'INSTITUICAO_FINANCEIRA';

// Disponibilidade de uma oportunidade de investimento (StatusOportunidade no backend).
export type StatusOportunidade = 'DISPONIVEL' | 'ENCERRADA';

// Estado de uma manifestacao de interesse (StatusInteresseCredora no backend).
export type StatusInteresseCredora = 'ATIVO' | 'CANCELADO';

// Estado de uma operacao da carteira financiada (StatusOperacaoFinanciada no backend).
export type StatusOperacaoFinanciada = 'ASSOCIADA' | 'ENCERRADA';

// POST /credores: cadastra a credora a partir de um onboarding PJ aprovado do proprio usuario.
// cnpj/razaoSocial nao sao enviados — derivam do KYB do onboarding referenciado.
export interface CadastrarCredoraRequest {
  onboardingId: string;
  tipoCredora: TipoCredora;
  capacidadeAporte?: number;
}

// GET /credores/me e resposta de POST /credores. cnpj ja chega formatado (00.000.000/0000-00);
// motivoInelegibilidade e capacidadeAporte podem vir nulos.
export interface EmpresaCredoraResponse {
  id: string;
  usuarioId: string;
  onboardingId: string;
  cnpj: string;
  razaoSocial: string;
  status: StatusCredora;
  elegibilidade: StatusElegibilidade;
  motivoInelegibilidade: string | null;
  tipoCredora: TipoCredora;
  capacidadeAporte: number | null;
  dataCriacao: string;
  dataModificacao: string;
}

// GET /credores/me/elegibilidade: status cadastral + elegibilidade derivada, sem recalculo no front.
export interface ElegibilidadeCredoraResponse {
  status: StatusCredora;
  elegibilidade: StatusElegibilidade;
  motivoInelegibilidade: string | null;
}

// GET /credores/oportunidades e /oportunidades/{id}. O backend NAO expoe estado de interesse por
// item: o front nunca infere interesse a partir desta resposta. contratoId nulo quando ainda nao
// ha contrato vinculado.
export interface OportunidadeResponse {
  id: string;
  propostaId: string;
  contratoId: string | null;
  valor: number;
  prazoMeses: number;
  taxaJurosMensal: number;
  status: StatusOportunidade;
  dataCriacao: string;
}

// Resposta de POST /credores/oportunidades/{id}/interesses.
export interface InteresseResponse {
  id: string;
  oportunidadeId: string;
  status: StatusInteresseCredora;
  dataCriacao: string;
}

// Resumo agregado de cobranca de uma operacao da carteira (CarteiraCobrancaResumo no backend).
// Apenas numeros agregados — sem dado sensivel do tomador. proximoVencimento nulo quando nao ha
// parcela em aberto.
export interface CarteiraCobrancaResumo {
  numeroParcelas: number;
  valorTotal: number;
  parcelasPagas: number;
  parcelasAtrasadas: number;
  totalRecebido: number;
  proximoVencimento: string | null;
}

// GET /credores/carteira e /carteira/{id}: DTO unico de lista e detalhe, enriquecido com snapshot
// da oportunidade e resumo de cobranca. valor/prazoMeses/taxaJurosMensal/oportunidadeId nulos
// quando a operacao nao referencia oportunidade; contratoStatus/cobranca nulos quando a leitura
// cross-module nao retorna dados.
export interface OperacaoCarteiraResponse {
  id: string;
  contratoId: string;
  oportunidadeId: string | null;
  status: StatusOperacaoFinanciada;
  justificativa: string;
  valor: number | null;
  prazoMeses: number | null;
  taxaJurosMensal: number | null;
  contratoStatus: string | null;
  cobranca: CarteiraCobrancaResumo | null;
  dataCriacao: string;
}

// --- Aporte e matching da credora (F-Sprint 18 / backend Sprints 29-30) ---
// Contratos minimos dos modulos de matching assistido e aporte assistido. Elegibilidade, valor
// elegivel, estados, ownership, idempotencia e escrow sao autoritativos no backend; o frontend
// apresenta os DTOs sem recalcular regra financeira. O backend nunca expoe motivo de decisao,
// decisor, score, idempotency key, referencia de escrow, provider ou motivo tecnico de falha.

// Estado da sugestao de matching credora-operacao (StatusMatchingCredoraOperacao no backend).
// SUGERIDA -> CONFIRMADA | REJEITADA; CONFIRMADA/REJEITADA sao terminais.
export type StatusMatchingCredoraOperacao = 'SUGERIDA' | 'CONFIRMADA' | 'REJEITADA';

// Acao da decisao assistida do matching (AcaoDecisaoMatching no backend).
export type AcaoDecisaoMatching = 'CONFIRMAR' | 'REJEITAR';

// Estado do aporte assistido (StatusAporteCredora no backend).
// PENDENTE -> EM_PROCESSAMENTO -> LIQUIDADO | FALHOU.
export type StatusAporteCredora = 'PENDENTE' | 'EM_PROCESSAMENTO' | 'LIQUIDADO' | 'FALHOU';

// GET /credores/matching/sugestoes, GET /credores/matching/{id} e resposta da decisao. criterios
// sao codigos funcionais do snapshot de elegibilidade; decididaEm e nula enquanto SUGERIDA.
export interface MatchingSugestaoResponse {
  id: string;
  operacaoId: string;
  empresaCredoraId: string;
  status: StatusMatchingCredoraOperacao;
  valorElegivel: number;
  criterios: string[];
  criadaEm: string;
  decididaEm: string | null;
}

// POST /credores/matching/{id}/decisao: motivo opcional de ate 255 caracteres. Decisao sobre
// status terminal responde 409. Confirmar apenas registra a decisao; nunca cria aporte.
export interface DecidirMatchingRequest {
  acao: AcaoDecisaoMatching;
  motivo?: string;
}

// POST /credores/operacoes/{operacaoId}/aportes: valor positivo com ate duas casas decimais. A
// Idempotency-Key vai no header e a operacao no path; 201 = registro novo, 200 = replay idempotente.
export interface RegistrarAporteRequest {
  valor: number;
}

// Resposta do POST e itens de GET /credores/operacoes/{operacaoId}/aportes (owner-scoped: 404
// neutro para usuario sem credora, operacao alheia ou inexistente).
export interface AporteCredoraResponse {
  id: string;
  operacaoId: string;
  status: StatusAporteCredora;
  valor: number;
  dataCriacao: string;
  dataAtualizacao: string;
}
