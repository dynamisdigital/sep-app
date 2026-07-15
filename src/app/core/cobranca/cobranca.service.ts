import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AgendaPagamentoResponse,
  EventoCobrancaResponse,
  InadimplenciaResponse,
  IniciarRenegociacaoRequest,
  RecebimentoResponse,
  RegistrarContatoRequest,
  RegistrarRecebimentoRequest,
  RenegociacaoResponse,
  RenegociacaoTomadorResponse,
  StatusParcela,
  ValorAtualizadoParcelaResponse,
} from '../api/api.models';

const COBRANCA_URL = `${environment.apiBaseUrl}/cobranca`;

export interface ListarInadimplenciaParams {
  diasAtrasoMin?: number;
  diasAtrasoMax?: number;
  status?: StatusParcela;
}

// Orquestra apenas o transporte HTTP da cobranca. Saldo, mora, multa, status e
// transicoes de parcela/renegociacao pertencem ao backend; o service propaga os DTOs
// sem interpreta-los como regra de negocio.
//
// Idempotency-Key e gerada por tentativa de recebimento pelo chamador e enviada como
// header desta unica request — nao persiste em storage. O step-up das operacoes de
// renegociacao (criacao/aceite) nao e responsabilidade deste service: o token vive no
// StepUpTokenStore e e anexado como X-Step-Up-Token pelo stepUpInterceptor, mantendo o
// transporte do token centralizado no interceptor como no resto do projeto.
@Injectable({ providedIn: 'root' })
export class CobrancaService {
  private readonly http = inject(HttpClient);

  consultarAgendaPorContrato(contratoId: string): Observable<AgendaPagamentoResponse> {
    return this.http.get<AgendaPagamentoResponse>(`${COBRANCA_URL}/contratos/${contratoId}/agenda`);
  }

  consultarParcela(id: string): Observable<ValorAtualizadoParcelaResponse> {
    return this.http.get<ValorAtualizadoParcelaResponse>(`${COBRANCA_URL}/parcelas/${id}`);
  }

  registrarRecebimento(
    parcelaId: string,
    request: RegistrarRecebimentoRequest,
    idempotencyKey: string,
  ): Observable<RecebimentoResponse> {
    return this.http.post<RecebimentoResponse>(
      `${COBRANCA_URL}/parcelas/${parcelaId}/recebimentos`,
      request,
      { headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }) },
    );
  }

  listarRecebimentos(): Observable<RecebimentoResponse[]> {
    return this.http.get<RecebimentoResponse[]>(`${COBRANCA_URL}/recebimentos`);
  }

  listarInadimplencia(params: ListarInadimplenciaParams = {}): Observable<InadimplenciaResponse[]> {
    return this.http.get<InadimplenciaResponse[]>(`${COBRANCA_URL}/inadimplencia`, {
      params: toInadimplenciaParams(params),
    });
  }

  registrarContato(
    parcelaId: string,
    request: RegistrarContatoRequest,
  ): Observable<EventoCobrancaResponse> {
    return this.http.post<EventoCobrancaResponse>(
      `${COBRANCA_URL}/parcelas/${parcelaId}/contato`,
      request,
    );
  }

  // Leitura owner-scoped do tomador (backend Sprint 24): sem step-up e sem token. O DTO
  // publico ja traz o total calculado; o service apenas transporta a resposta.
  consultarRenegociacaoAtiva(parcelaId: string): Observable<RenegociacaoTomadorResponse> {
    return this.http.get<RenegociacaoTomadorResponse>(
      `${COBRANCA_URL}/parcelas/${parcelaId}/renegociacao-ativa`,
    );
  }

  // Step-up exigido pelo backend; anexado pelo stepUpInterceptor (ver nota da classe).
  iniciarRenegociacao(
    parcelaId: string,
    request: IniciarRenegociacaoRequest,
  ): Observable<RenegociacaoResponse> {
    return this.http.post<RenegociacaoResponse>(
      `${COBRANCA_URL}/parcelas/${parcelaId}/renegociacao`,
      request,
    );
  }

  // Step-up exigido pelo backend; anexado pelo stepUpInterceptor (ver nota da classe).
  aceitarRenegociacao(renegociacaoId: string): Observable<RenegociacaoResponse> {
    return this.http.patch<RenegociacaoResponse>(
      `${COBRANCA_URL}/renegociacoes/${renegociacaoId}/aceite`,
      {},
    );
  }

  recusarRenegociacao(renegociacaoId: string): Observable<RenegociacaoResponse> {
    return this.http.patch<RenegociacaoResponse>(
      `${COBRANCA_URL}/renegociacoes/${renegociacaoId}/recusa`,
      {},
    );
  }
}

// Mapeia os filtros para os query params snake_case esperados pelo backend, omitindo
// valores vazios para nao enviar parametros em branco.
function toInadimplenciaParams(params: ListarInadimplenciaParams): HttpParams {
  let httpParams = new HttpParams();
  if (params.diasAtrasoMin != null) {
    httpParams = httpParams.set('dias_atraso_min', String(params.diasAtrasoMin));
  }
  if (params.diasAtrasoMax != null) {
    httpParams = httpParams.set('dias_atraso_max', String(params.diasAtrasoMax));
  }
  if (params.status) {
    httpParams = httpParams.set('status', params.status);
  }
  return httpParams;
}
