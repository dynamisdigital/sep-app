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

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

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
  role: UsuarioRole;
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
