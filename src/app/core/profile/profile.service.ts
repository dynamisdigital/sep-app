import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AtualizarPreferenciasPerfilRequest, PerfilOperacionalResponse } from '../api/api.models';

const PROFILE_URL = `${environment.apiBaseUrl}/auth/profile-operacional`;

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);

  consultar(): Observable<PerfilOperacionalResponse> {
    return this.http.get<PerfilOperacionalResponse>(PROFILE_URL);
  }

  atualizarPreferencias(
    request: AtualizarPreferenciasPerfilRequest,
  ): Observable<PerfilOperacionalResponse> {
    return this.http.patch<PerfilOperacionalResponse>(`${PROFILE_URL}/preferencias`, request);
  }
}
