import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, of, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LoginRequest, TokenResponse, UsuarioResponse } from '../api/api.models';

const API_BASE_URL = environment.apiBaseUrl;
const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';
const PENDING_MFA_CHALLENGE_KEY = 'SEP_PENDING_MFA_CHALLENGE';

/**
 * Servico de autenticacao web (canal WEB; follow-up 5F-FIX-02 da Sprint 5).
 *
 * - Access token continua em `localStorage` (decisao do projeto; trade-off
 *   discutido em CONTEXT.md). Refresh token NUNCA e persistido no cliente:
 *   o backend devolve em `Set-Cookie HttpOnly` (canal `X-Client-Channel: WEB`,
 *   anexado pelo `clientChannelInterceptor`). Refresh e logout viajam apenas
 *   com cookie + `withCredentials`.
 * - MFA challenge id continua em `localStorage` pra sobreviver a reload
 *   entre `/auth/login` e `/auth/totp/verify`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentUserState = signal<UsuarioResponse | null>(null);
  private readonly loadingUserState = signal(false);
  private readonly pendingMfaChallengeState = signal<string | null>(
    window.localStorage.getItem(PENDING_MFA_CHALLENGE_KEY),
  );

  readonly currentUser = this.currentUserState.asReadonly();
  readonly loadingUser = this.loadingUserState.asReadonly();
  readonly pendingMfaChallenge = this.pendingMfaChallengeState.asReadonly();
  readonly hasToken = computed(() => Boolean(this.getAccessToken()));
  readonly isAuthenticated = computed(
    () => Boolean(this.getAccessToken()) && Boolean(this.currentUserState()),
  );

  login(payload: LoginRequest): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${API_BASE_URL}/auth/login`, payload)
      .pipe(tap((response) => this.handleTokenResponse(response)));
  }

  /**
   * Sprint 5: quando o login retorna {@code mfaRequired=true}, o cliente
   * apresenta o codigo TOTP em {@code /auth/totp/verify} e a resposta vem com
   * tokens finais. Reaproveita {@link handleTokenResponse} para persistir.
   */
  applyMfaVerifyResponse(response: TokenResponse): void {
    this.handleTokenResponse(response);
  }

  loadCurrentUser(): Observable<UsuarioResponse> {
    this.loadingUserState.set(true);
    return this.http.get<UsuarioResponse>(`${API_BASE_URL}/auth/me`).pipe(
      tap((usuario) => this.currentUserState.set(usuario)),
      finalize(() => this.loadingUserState.set(false)),
    );
  }

  // Alias mantido para compat com testes da F-Sprint 2; preferir loadCurrentUser.
  me(): Observable<UsuarioResponse> {
    return this.loadCurrentUser();
  }

  /**
   * Solicita rotacao do refresh token. O refresh vive no cookie HttpOnly
   * `sep-refresh` (5F-FIX-02); aqui apenas postamos com `withCredentials`
   * (anexado pelo `clientChannelInterceptor`) e o backend resolve via cookie.
   */
  refresh(): Observable<TokenResponse | null> {
    return this.http.post<TokenResponse>(`${API_BASE_URL}/auth/refresh`, {}).pipe(
      tap((response) => this.handleTokenResponse(response)),
      catchError(() => {
        this.clearSession();
        return of(null);
      }),
    );
  }

  clearSession(): void {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(PENDING_MFA_CHALLENGE_KEY);
    this.currentUserState.set(null);
    this.pendingMfaChallengeState.set(null);
  }

  /**
   * Logout: cookie `sep-refresh` viaja automaticamente; backend revoga e
   * limpa o cookie via `Set-Cookie Max-Age=0`. Mesmo em falha, limpa estado
   * local pra evitar sessao zumbi.
   */
  logout(): Observable<void> {
    const request = this.http.post(`${API_BASE_URL}/auth/logout`, {});
    return new Observable<void>((subscriber) => {
      const sub = request.subscribe({
        next: () => {
          this.clearSession();
          subscriber.next();
          subscriber.complete();
        },
        error: () => {
          this.clearSession();
          subscriber.next();
          subscriber.complete();
        },
      });
      return () => sub.unsubscribe();
    });
  }

  logoutAll(): Observable<void> {
    return this.http
      .post<void>(`${API_BASE_URL}/auth/logout-all`, {})
      .pipe(tap(() => this.clearSession()));
  }

  getAccessToken(): string | null {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  private handleTokenResponse(response: TokenResponse): void {
    if (response.mfaRequired && response.mfaChallengeId) {
      window.localStorage.setItem(PENDING_MFA_CHALLENGE_KEY, response.mfaChallengeId);
      this.pendingMfaChallengeState.set(response.mfaChallengeId);
      return;
    }
    window.localStorage.removeItem(PENDING_MFA_CHALLENGE_KEY);
    this.pendingMfaChallengeState.set(null);
    if (response.accessToken) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    }
    // refresh token nao e persistido — vive no cookie HttpOnly (5F-FIX-02).
    if (response.usuario) {
      this.currentUserState.set(response.usuario);
    }
  }
}
