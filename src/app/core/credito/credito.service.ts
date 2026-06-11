import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CriarPropostaRequest,
  IniciarConsentimentoOpenFinanceRequest,
  IniciarConsentimentoOpenFinanceResponse,
  OpenFinanceStatusResponse,
  PageResponse,
  PropostaResponse,
  RegraAvaliadaResponse,
  StatusProposta,
} from '../api/api.models';

const PROPOSTAS_URL = `${environment.apiBaseUrl}/credito/propostas`;

export interface ListarPropostasParams {
  status?: StatusProposta;
  tomadorId?: string;
  page?: number;
  size?: number;
}

// Orquestra apenas o transporte HTTP de credito/Open Finance. Score, status de
// proposta e decisao de consentimento pertencem ao backend; o service propaga os
// DTOs sem interpreta-los como regra de negocio e nunca chama provider externo direto.
@Injectable({ providedIn: 'root' })
export class CreditoService {
  private readonly http = inject(HttpClient);

  criarProposta(request: CriarPropostaRequest): Observable<PropostaResponse> {
    return this.http.post<PropostaResponse>(PROPOSTAS_URL, request);
  }

  listarPropostas(params: ListarPropostasParams = {}): Observable<PageResponse<PropostaResponse>> {
    return this.http.get<PageResponse<PropostaResponse>>(PROPOSTAS_URL, {
      params: toHttpParams(params),
    });
  }

  consultarProposta(id: string): Observable<PropostaResponse> {
    return this.http.get<PropostaResponse>(`${PROPOSTAS_URL}/${id}`);
  }

  // Restrito a FINANCEIRO/ADMIN no backend; usado apenas quando a UI interna precisar.
  listarRegras(id: string): Observable<RegraAvaliadaResponse[]> {
    return this.http.get<RegraAvaliadaResponse[]>(`${PROPOSTAS_URL}/${id}/regras`);
  }

  iniciarConsentimentoOpenFinance(
    id: string,
    request: IniciarConsentimentoOpenFinanceRequest,
  ): Observable<IniciarConsentimentoOpenFinanceResponse> {
    return this.http.post<IniciarConsentimentoOpenFinanceResponse>(
      `${PROPOSTAS_URL}/${id}/open-finance/consentimento`,
      request,
    );
  }

  consultarOpenFinance(id: string): Observable<OpenFinanceStatusResponse> {
    return this.http.get<OpenFinanceStatusResponse>(`${PROPOSTAS_URL}/${id}/open-finance`);
  }
}

// Omite valores vazios/nulos para nao enviar query params em branco ao backend.
function toHttpParams(params: ListarPropostasParams): HttpParams {
  let httpParams = new HttpParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (valor !== undefined && valor !== null && valor !== '') {
      httpParams = httpParams.set(chave, String(valor));
    }
  }
  return httpParams;
}
