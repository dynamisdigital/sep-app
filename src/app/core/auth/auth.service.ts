import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import {
  LoginRequest,
  TokenResponse,
  UsuarioCreateRequest,
  UsuarioResponse,
} from '../api/api.models';

const API_BASE_URL = 'http://localhost:8080/api/v1';
const ACCESS_TOKEN_KEY = 'SEP_ACCESS_TOKEN';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly currentUserState = signal<UsuarioResponse | null>(null);

  readonly currentUser = this.currentUserState.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.currentUserState()));

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

  me(): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${API_BASE_URL}/auth/me`).pipe(
      tap((usuario) => {
        this.currentUserState.set(usuario);
      }),
    );
  }

  logout(): void {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    this.currentUserState.set(null);
  }

  getAccessToken(): string | null {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  }
}
