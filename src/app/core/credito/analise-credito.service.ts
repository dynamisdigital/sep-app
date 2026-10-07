import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AnaliseCreditoResponse,
  ExecutarAnaliseRequest,
  ParametrosAnalise,
  RegistrarParecerRequest,
} from './analise-credito.models';

const BASE = `${environment.apiBaseUrl}/credito`;

// Transporte HTTP da analise de credito. A consulta aos bureaus, o score e as regras sao do backend; o
// front apenas pede a analise, apresenta o resultado e registra o parecer do analista.
@Injectable({ providedIn: 'root' })
export class AnaliseCreditoService {
  private readonly http = inject(HttpClient);

  consultarParametros(): Observable<ParametrosAnalise> {
    return this.http.get<ParametrosAnalise>(`${BASE}/analise/parametros`);
  }

  /** Apenas ADMIN; `justificativa` obrigatoria. */
  atualizarParametros(
    body: Partial<ParametrosAnalise> & { justificativa: string },
  ): Observable<ParametrosAnalise> {
    return this.http.put<ParametrosAnalise>(`${BASE}/analise/parametros`, body);
  }

  /** 404 quando a proposta ainda nao foi analisada. */
  consultarAnalise(propostaId: string): Observable<AnaliseCreditoResponse> {
    return this.http.get<AnaliseCreditoResponse>(`${BASE}/propostas/${propostaId}/analise`);
  }

  executarAnalise(
    propostaId: string,
    body: ExecutarAnaliseRequest,
  ): Observable<AnaliseCreditoResponse> {
    return this.http.post<AnaliseCreditoResponse>(`${BASE}/propostas/${propostaId}/analise`, body);
  }

  registrarParecer(
    propostaId: string,
    body: RegistrarParecerRequest,
  ): Observable<AnaliseCreditoResponse> {
    return this.http.post<AnaliseCreditoResponse>(
      `${BASE}/propostas/${propostaId}/analise/parecer`,
      body,
    );
  }
}
