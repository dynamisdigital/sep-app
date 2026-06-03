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
