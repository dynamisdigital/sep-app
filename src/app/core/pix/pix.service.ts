import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  GerarReferenciaRecebimentoPixRequest,
  PixDesembolsoResponse,
  PixRecebimentoResponse,
  PixReferenciaRecebimentoResponse,
  PixStatusDesembolsoResponse,
  SolicitarDesembolsoPixRequest,
} from '../api/api.models';

const DESEMBOLSOS_URL = `${environment.apiBaseUrl}/pix/desembolsos`;
const RECEBIMENTOS_URL = `${environment.apiBaseUrl}/pix/recebimentos`;

// Transporte HTTP do Pix operacional (Epic 15 / backend Sprints 19-21): desembolso assistido,
// status de transferencia, referencias e recebimentos de parcela. Elegibilidade, idempotencia,
// conciliacao, escrow e provider pertencem ao backend; o service apenas propaga os DTOs.
//
// As operacoes sensiveis (POST /desembolsos e POST /desembolsos/{id}/status) exigem step-up: o
// token vive no StepUpTokenStore e e anexado como X-Step-Up-Token pelo stepUpInterceptor. O
// service nunca recebe nem manipula esse token. A Idempotency-Key e gerada por tentativa pelo
// componente e so acompanha o POST de desembolso; as leituras nunca a enviam.
@Injectable({ providedIn: 'root' })
export class PixService {
  private readonly http = inject(HttpClient);

  // Step-up (estrito) e Idempotency-Key exigidos pelo backend. O token vem do stepUpInterceptor;
  // a key e gerada por tentativa e passada pelo componente (ver nota da classe).
  solicitarDesembolso(
    request: SolicitarDesembolsoPixRequest,
    idempotencyKey: string,
  ): Observable<PixDesembolsoResponse> {
    return this.http.post<PixDesembolsoResponse>(DESEMBOLSOS_URL, request, {
      headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
    });
  }

  consultarDesembolso(id: string): Observable<PixStatusDesembolsoResponse> {
    return this.http.get<PixStatusDesembolsoResponse>(`${DESEMBOLSOS_URL}/${id}`);
  }

  // Reconsulta o provider e sincroniza o status local. Step-up exigido pelo backend; anexado pelo
  // stepUpInterceptor (ver nota da classe). Sem body: o id vai no path.
  consultarStatusDesembolso(id: string): Observable<PixStatusDesembolsoResponse> {
    return this.http.post<PixStatusDesembolsoResponse>(`${DESEMBOLSOS_URL}/${id}/status`, null);
  }

  gerarReferenciaRecebimento(
    request: GerarReferenciaRecebimentoPixRequest,
  ): Observable<PixReferenciaRecebimentoResponse> {
    return this.http.post<PixReferenciaRecebimentoResponse>(
      `${RECEBIMENTOS_URL}/referencias`,
      request,
    );
  }

  consultarReferenciaRecebimento(id: string): Observable<PixReferenciaRecebimentoResponse> {
    return this.http.get<PixReferenciaRecebimentoResponse>(`${RECEBIMENTOS_URL}/referencias/${id}`);
  }

  consultarRecebimento(id: string): Observable<PixRecebimentoResponse> {
    return this.http.get<PixRecebimentoResponse>(`${RECEBIMENTOS_URL}/${id}`);
  }
}
