import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  LoginRequest,
  TokenResponse,
  UsuarioCreateRequest,
  UsuarioResponse,
} from '../api/api.models';

const API_BASE_URL = environment.apiBaseUrl;
const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentUserState = signal<UsuarioResponse | null>(null);
  private readonly loadingUserState = signal(false);

  readonly currentUser = this.currentUserState.asReadonly();
  readonly loadingUser = this.loadingUserState.asReadonly();
  readonly hasToken = computed(() => Boolean(this.getAccessToken()));
  readonly isAuthenticated = computed(
    () => Boolean(this.getAccessToken()) && Boolean(this.currentUserState()),
  );

  login(payload: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${API_BASE_URL}/auth/login`, payload).pipe(
      tap((response) => {
        window.localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
        this.currentUserState.set(response.usuario);
      }),
    );
  }

  register(payload: UsuarioCreateRequest): Observable<UsuarioResponse> {
    return this.http.post<UsuarioResponse>(`${API_BASE_URL}/usuarios`, payload);
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

  clearSession(): void {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    this.currentUserState.set(null);
  }

  logout(): void {
    this.clearSession();
  }

  getAccessToken(): string | null {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  }
}
