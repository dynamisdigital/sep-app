import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ComentarioInternoResponse,
  ComentarioRequest,
  DashboardResponse,
  IgnorarRequest,
  ItemFilaDetalheResponse,
  ItemFilaResponse,
  PageResponse,
  PrioridadeItem,
  ReprocessoRequest,
  ReprocessoResponse,
  ResolverRequest,
  StatusItemFila,
  TipoChamadaProvider,
  TipoItemFila,
} from '../api/api.models';

const BACKOFFICE_URL = `${environment.apiBaseUrl}/backoffice`;

export interface ListarFilaParams {
  tipo?: TipoItemFila;
  prioridade?: PrioridadeItem;
  status?: StatusItemFila;
  dataAberturaDe?: string;
  dataAberturaAte?: string;
  atribuidoA?: string;
  page?: number;
  size?: number;
  sort?: string;
}

// Orquestra apenas o transporte HTTP da operacao de backoffice/financeiro. Transicoes de
// status, validacao de estado, audit trail, anti-abuso e autorizacao real pertencem ao
// backend; o service propaga os DTOs sem interpreta-los como regra de negocio.
//
// resolver, ignorar e os reprocessos exigem step-up: o token vive no StepUpTokenStore e e
// anexado como X-Step-Up-Token pelo stepUpInterceptor. O service nao recebe token como
// parametro, mantendo o transporte do token centralizado no interceptor como no resto do
// projeto.
@Injectable({ providedIn: 'root' })
export class BackofficeService {
  private readonly http = inject(HttpClient);

  consultarDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(`${BACKOFFICE_URL}/dashboard`);
  }

  listarFila(params: ListarFilaParams = {}): Observable<PageResponse<ItemFilaResponse>> {
    return this.http.get<PageResponse<ItemFilaResponse>>(`${BACKOFFICE_URL}/fila`, {
      params: toFilaParams(params),
    });
  }

  consultarItem(id: string): Observable<ItemFilaDetalheResponse> {
    return this.http.get<ItemFilaDetalheResponse>(`${BACKOFFICE_URL}/fila/${id}`);
  }

  assumirItem(id: string): Observable<ItemFilaResponse> {
    return this.http.post<ItemFilaResponse>(`${BACKOFFICE_URL}/fila/${id}/assumir`, {});
  }

  registrarComentario(
    itemId: string,
    request: ComentarioRequest,
  ): Observable<ComentarioInternoResponse> {
    return this.http.post<ComentarioInternoResponse>(
      `${BACKOFFICE_URL}/fila/${itemId}/comentarios`,
      request,
    );
  }

  // Step-up exigido pelo backend; anexado pelo stepUpInterceptor (ver nota da classe).
  resolverItem(itemId: string, request: ResolverRequest): Observable<ItemFilaResponse> {
    return this.http.patch<ItemFilaResponse>(`${BACKOFFICE_URL}/fila/${itemId}/resolver`, request);
  }

  // Step-up exigido pelo backend; anexado pelo stepUpInterceptor (ver nota da classe).
  ignorarItem(itemId: string, request: IgnorarRequest): Observable<ItemFilaResponse> {
    return this.http.patch<ItemFilaResponse>(`${BACKOFFICE_URL}/fila/${itemId}/ignorar`, request);
  }

  // Step-up exigido pelo backend; anexado pelo stepUpInterceptor (ver nota da classe).
  reprocessarWebhook(
    webhookEventId: string,
    request?: ReprocessoRequest,
  ): Observable<ReprocessoResponse> {
    return this.http.post<ReprocessoResponse>(
      `${BACKOFFICE_URL}/reprocessos/webhook/${webhookEventId}`,
      request ?? {},
    );
  }

  // Step-up exigido pelo backend; anexado pelo stepUpInterceptor (ver nota da classe).
  reprocessarProvider(
    tipoChamada: TipoChamadaProvider,
    entidadeId: string,
    request?: ReprocessoRequest,
  ): Observable<ReprocessoResponse> {
    return this.http.post<ReprocessoResponse>(
      `${BACKOFFICE_URL}/reprocessos/provider/${tipoChamada}/${entidadeId}`,
      request ?? {},
    );
  }
}

// Mapeia filtros para os query params esperados pelo backend (snake_case nas datas e
// atribuicao), omitindo valores vazios para nao enviar parametros em branco.
function toFilaParams(params: ListarFilaParams): HttpParams {
  let httpParams = new HttpParams();
  if (params.tipo) {
    httpParams = httpParams.set('tipo', params.tipo);
  }
  if (params.prioridade) {
    httpParams = httpParams.set('prioridade', params.prioridade);
  }
  if (params.status) {
    httpParams = httpParams.set('status', params.status);
  }
  if (params.dataAberturaDe) {
    httpParams = httpParams.set('data_abertura_de', params.dataAberturaDe);
  }
  if (params.dataAberturaAte) {
    httpParams = httpParams.set('data_abertura_ate', params.dataAberturaAte);
  }
  if (params.atribuidoA) {
    httpParams = httpParams.set('atribuido_a', params.atribuidoA);
  }
  if (params.page != null) {
    httpParams = httpParams.set('page', String(params.page));
  }
  if (params.size != null) {
    httpParams = httpParams.set('size', String(params.size));
  }
  if (params.sort) {
    httpParams = httpParams.set('sort', params.sort);
  }
  return httpParams;
}
