import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UsuarioResponse, UsuarioSenhaUpdateRequest } from '../api/api.models';

const API_BASE_URL = environment.apiBaseUrl;

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpClient);

  listar(): Observable<UsuarioResponse[]> {
    return this.http.get<UsuarioResponse[]>(`${API_BASE_URL}/usuarios`);
  }

  buscarPorId(id: string): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${API_BASE_URL}/usuarios/${id}`);
  }

  alterarSenha(id: string, payload: UsuarioSenhaUpdateRequest): Observable<void> {
    return this.http.patch<void>(`${API_BASE_URL}/usuarios/${id}/senha`, payload);
  }
}
