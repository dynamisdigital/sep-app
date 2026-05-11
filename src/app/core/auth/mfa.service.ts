import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  StepUpCompleteRequest,
  StepUpCompleteResponse,
  StepUpInitiateResponse,
  TokenResponse,
  TotpConfirmRequest,
  TotpDisableRequest,
  TotpSetupResponse,
  TotpVerifyRequest,
} from '../api/api.models';

const API_BASE_URL = environment.apiBaseUrl;

/**
 * Sprint 5: chamadas ao backend para o ciclo de MFA TOTP + step-up.
 *
 * - {@link setup}/{@link confirm}/{@link disable}: gerenciamento por usuario autenticado.
 * - {@link verify}: completa o login apos /auth/login retornar {@code mfaRequired=true}.
 * - {@link stepUpInitiate}/{@link stepUpComplete}: emite step-up token para operacoes sensiveis.
 */
@Injectable({ providedIn: 'root' })
export class MfaService {
  private readonly http = inject(HttpClient);

  setup(): Observable<TotpSetupResponse> {
    return this.http.post<TotpSetupResponse>(`${API_BASE_URL}/auth/totp/setup`, {});
  }

  confirm(codigo: string): Observable<void> {
    const body: TotpConfirmRequest = { codigo };
    return this.http.post<void>(`${API_BASE_URL}/auth/totp/confirm`, body);
  }

  verify(payload: TotpVerifyRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${API_BASE_URL}/auth/totp/verify`, payload);
  }

  disable(passwordAtual: string): Observable<void> {
    const body: TotpDisableRequest = { passwordAtual };
    return this.http.post<void>(`${API_BASE_URL}/auth/totp/disable`, body);
  }

  stepUpInitiate(): Observable<StepUpInitiateResponse> {
    return this.http.post<StepUpInitiateResponse>(`${API_BASE_URL}/auth/step-up/initiate`, {});
  }

  stepUpComplete(payload: StepUpCompleteRequest): Observable<StepUpCompleteResponse> {
    return this.http.post<StepUpCompleteResponse>(`${API_BASE_URL}/auth/step-up/complete`, payload);
  }
}
