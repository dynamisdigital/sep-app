import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AtualizarPercentuaisSubRequest,
  ComissaoDaRedeResponse,
  CriarSubRequest,
  MinhaPosicaoNaRedeResponse,
  OperacaoDaRedeResponse,
  RedeDoMajoritarioResponse,
  SubCorrespondenteResponse,
} from './correspondentes-rede.models';

const BASE = `${environment.apiBaseUrl}/correspondentes/me/rede`;

// Transporte HTTP da rede de sub-correspondentes. O teto de repasse por produto e o isolamento (um sub so
// ve a si mesmo) sao impostos pelo backend; o front apenas mostra e recusa de cara o que passa do teto.
@Injectable({ providedIn: 'root' })
export class CorrespondentesRedeService {
  private readonly http = inject(HttpClient);

  consultarMinhaPosicao(): Observable<MinhaPosicaoNaRedeResponse> {
    return this.http.get<MinhaPosicaoNaRedeResponse>(`${BASE}/posicao`);
  }

  consultarRede(): Observable<RedeDoMajoritarioResponse> {
    return this.http.get<RedeDoMajoritarioResponse>(BASE);
  }

  criarSub(body: CriarSubRequest): Observable<SubCorrespondenteResponse> {
    return this.http.post<SubCorrespondenteResponse>(`${BASE}/subs`, body);
  }

  atualizarPercentuais(
    subId: string,
    body: AtualizarPercentuaisSubRequest,
  ): Observable<SubCorrespondenteResponse> {
    return this.http.put<SubCorrespondenteResponse>(`${BASE}/subs/${subId}/percentuais`, body);
  }

  suspender(subId: string): Observable<SubCorrespondenteResponse> {
    return this.http.post<SubCorrespondenteResponse>(`${BASE}/subs/${subId}/suspender`, {});
  }

  reativar(subId: string): Observable<SubCorrespondenteResponse> {
    return this.http.post<SubCorrespondenteResponse>(`${BASE}/subs/${subId}/reativar`, {});
  }

  consultarCarteira(): Observable<OperacaoDaRedeResponse[]> {
    return this.http.get<OperacaoDaRedeResponse[]>(`${BASE}/carteira`);
  }

  consultarComissoes(): Observable<ComissaoDaRedeResponse> {
    return this.http.get<ComissaoDaRedeResponse>(`${BASE}/comissoes`);
  }
}
