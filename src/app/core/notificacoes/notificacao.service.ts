import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { NotificacaoResponse, NotificacoesNaoLidasResponse, PageResponse } from '../api/api.models';

const NOTIFICACOES_URL = `${environment.apiBaseUrl}/notificacoes`;

// Transporte HTTP da central de notificacoes (backend Sprint 38, ADR 0021). O dono e sempre o
// usuario do token: nenhuma chamada aceita usuario por parametro. Ordenacao, recorte IN_APP,
// ownership e idempotencia da leitura pertencem ao backend; o service so propaga os DTOs.
@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  private readonly http = inject(HttpClient);

  // `page` a partir de 0 e `size` de 1 a 100; fora disso o backend responde 400 NTF-400-001.
  listar(page: number, size: number): Observable<PageResponse<NotificacaoResponse>> {
    return this.http.get<PageResponse<NotificacaoResponse>>(NOTIFICACOES_URL, {
      params: { page, size },
    });
  }

  contarNaoLidas(): Observable<NotificacoesNaoLidasResponse> {
    return this.http.get<NotificacoesNaoLidasResponse>(`${NOTIFICACOES_URL}/nao-lidas/contagem`);
  }

  // POST sem corpo e idempotente: repetir devolve 200 com a `lidaEm` da primeira leitura, entao um
  // retry apos timeout nao precisa de Idempotency-Key. Inexistente, alheia ou de e-mail: mesmo 404.
  marcarComoLida(id: string): Observable<NotificacaoResponse> {
    return this.http.post<NotificacaoResponse>(`${NOTIFICACOES_URL}/${id}/leitura`, null);
  }
}
