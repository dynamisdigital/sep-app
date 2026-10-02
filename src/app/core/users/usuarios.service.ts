import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  UsuarioCreateRequest,
  UsuarioResponse,
  UsuarioSenhaUpdateRequest,
} from '../api/api.models';

const API_BASE_URL = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);

  listar(): Observable<UsuarioResponse[]> {
    return this.http.get<UsuarioResponse[]>(`${API_BASE_URL}/usuarios`);
  }

  // O backend sempre cria CLIENTE e ignora `role`: os demais papeis vao por PUT /usuarios/:id/roles,
  // que exige step-up. Por isso o corpo aqui leva so as credenciais.
  criar(payload: Pick<UsuarioCreateRequest, 'username' | 'password'>): Observable<UsuarioResponse> {
    return this.http.post<UsuarioResponse>(`${API_BASE_URL}/usuarios`, payload);
  }

  buscarPorId(id: string): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${API_BASE_URL}/usuarios/${id}`);
  }

  alterarSenha(id: string, payload: UsuarioSenhaUpdateRequest): Observable<void> {
    return this.http.patch<void>(`${API_BASE_URL}/usuarios/${id}/senha`, payload);
  }
}
