import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AutorizacaoPixResponse,
  CriarAutorizacaoPixRequest,
  DebitoPixResponse,
  ParametrosPixAutomatico,
  ResumoPixAutomatico,
} from './pix-automatico.models';

const BASE = `${environment.apiBaseUrl}/pix-automatico`;

// Transporte HTTP do Pix Automatico. A criacao da recorrencia, o aceite do tomador e as cobrancas passam
// pela instituicao participante; aqui so se registra a autorizacao e se acompanha o que foi cobrado.
@Injectable({ providedIn: 'root' })
export class PixAutomaticoService {
  private readonly http = inject(HttpClient);

  consultarParametros(): Observable<ParametrosPixAutomatico> {
    return this.http.get<ParametrosPixAutomatico>(`${BASE}/parametros`);
  }

  /** Apenas ADMIN. */
  atualizarParametros(
    body: Partial<ParametrosPixAutomatico> & { justificativa: string },
  ): Observable<ParametrosPixAutomatico> {
    return this.http.put<ParametrosPixAutomatico>(`${BASE}/parametros`, body);
  }

  consultarResumo(): Observable<ResumoPixAutomatico> {
    return this.http.get<ResumoPixAutomatico>(`${BASE}/resumo`);
  }

  listarAutorizacoes(): Observable<AutorizacaoPixResponse[]> {
    return this.http.get<AutorizacaoPixResponse[]>(`${BASE}/autorizacoes`);
  }

  criarAutorizacao(body: CriarAutorizacaoPixRequest): Observable<AutorizacaoPixResponse> {
    return this.http.post<AutorizacaoPixResponse>(`${BASE}/autorizacoes`, body);
  }

  revogar(id: string, motivo: string): Observable<AutorizacaoPixResponse> {
    return this.http.post<AutorizacaoPixResponse>(`${BASE}/autorizacoes/${id}/revogar`, { motivo });
  }

  listarDebitos(id: string): Observable<DebitoPixResponse[]> {
    return this.http.get<DebitoPixResponse[]>(`${BASE}/autorizacoes/${id}/debitos`);
  }

  /** Somente demonstracao: no real, o aceite acontece no aplicativo do banco do tomador. */
  simularAceiteDoPagador(id: string, aceitou: boolean): Observable<AutorizacaoPixResponse> {
    return this.http.post<AutorizacaoPixResponse>(`${BASE}/autorizacoes/${id}/simular-aceite`, {
      aceitou,
    });
  }
}
