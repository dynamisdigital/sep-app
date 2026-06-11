import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AlterarParametroRequest,
  ParametroComHistorico,
  ParametroOperacional,
  SubstituirRolesRequest,
  UsuarioRole,
  UsuarioRolesResponse,
} from '../api/api.models';

const USUARIOS_URL = `${environment.apiBaseUrl}/usuarios`;
const PARAMETROS_URL = `${environment.apiBaseUrl}/governanca/parametros`;

// Transporte HTTP da governanca (Epic 11 + 13): roles cumulativas e parametros operacionais
// (modulo governanca / Sprint 18). Precedencia de role, validacao de tipo, versionamento e
// auditoria pertencem ao backend; o service apenas propaga os DTOs, sem interpreta-los.
//
// As mutacoes (PUT/POST/DELETE de roles, PATCH de parametro) exigem step-up: o token vive no
// StepUpTokenStore e e anexado como X-Step-Up-Token pelo stepUpInterceptor. O service nao
// recebe token como parametro. Os reads nunca consomem token.
@Injectable({ providedIn: 'root' })
export class GovernancaService {
  private readonly http = inject(HttpClient);

  consultarRoles(usuarioId: string): Observable<UsuarioRolesResponse> {
    return this.http.get<UsuarioRolesResponse>(`${USUARIOS_URL}/${usuarioId}/roles`);
  }

  // Step-up exigido pelo backend; anexado pelo stepUpInterceptor (ver nota da classe).
  substituirRoles(
    usuarioId: string,
    request: SubstituirRolesRequest,
  ): Observable<UsuarioRolesResponse> {
    return this.http.put<UsuarioRolesResponse>(`${USUARIOS_URL}/${usuarioId}/roles`, request);
  }

  // Step-up exigido pelo backend; anexado pelo stepUpInterceptor (ver nota da classe).
  // Sem body: a role-alvo vai no path; backend nao espera corpo (espelha @PostMapping sem @RequestBody).
  adicionarRole(usuarioId: string, role: UsuarioRole): Observable<UsuarioRolesResponse> {
    return this.http.post<UsuarioRolesResponse>(`${USUARIOS_URL}/${usuarioId}/roles/${role}`, null);
  }

  // Step-up exigido pelo backend; anexado pelo stepUpInterceptor (ver nota da classe).
  removerRole(usuarioId: string, role: UsuarioRole): Observable<UsuarioRolesResponse> {
    return this.http.delete<UsuarioRolesResponse>(`${USUARIOS_URL}/${usuarioId}/roles/${role}`);
  }

  listarParametros(): Observable<ParametroOperacional[]> {
    return this.http.get<ParametroOperacional[]>(PARAMETROS_URL);
  }

  consultarParametro(chave: string): Observable<ParametroComHistorico> {
    return this.http.get<ParametroComHistorico>(`${PARAMETROS_URL}/${chave}`);
  }

  // Step-up exigido pelo backend; anexado pelo stepUpInterceptor (ver nota da classe).
  alterarParametro(
    chave: string,
    request: AlterarParametroRequest,
  ): Observable<ParametroOperacional> {
    return this.http.patch<ParametroOperacional>(`${PARAMETROS_URL}/${chave}`, request);
  }
}
