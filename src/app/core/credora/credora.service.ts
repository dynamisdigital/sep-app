import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CadastrarCredoraRequest,
  ElegibilidadeCredoraResponse,
  EmpresaCredoraResponse,
  InteresseResponse,
  OperacaoCarteiraResponse,
  OportunidadeResponse,
} from '../api/api.models';

const CREDORES_URL = `${environment.apiBaseUrl}/credores`;
const OPORTUNIDADES_URL = `${CREDORES_URL}/oportunidades`;
const CARTEIRA_URL = `${CREDORES_URL}/carteira`;

// Transporte HTTP da jornada credora (Epic 10 / backend Sprints 16-17): cadastro a partir de
// onboarding PJ aprovado, perfil/elegibilidade, oportunidades, interesse e carteira. Elegibilidade,
// ownership, unicidade de interesse, associacao de carteira e auditoria pertencem ao backend; o
// service apenas propaga os DTOs e nunca recalcula regra de negocio. Nenhuma operacao desta jornada
// usa step-up.
@Injectable({ providedIn: 'root' })
export class CredoraService {
  private readonly http = inject(HttpClient);

  cadastrarCredora(request: CadastrarCredoraRequest): Observable<EmpresaCredoraResponse> {
    return this.http.post<EmpresaCredoraResponse>(CREDORES_URL, request);
  }

  // GET /credores/me. Retorna 404 (canal de erro) quando o usuario ainda nao tem credora; o
  // consumidor distingue esse 404 de falha real pelo status do HttpErrorResponse e roteia ao
  // cadastro, sem tratar a ausencia como erro.
  consultarMinhaCredora(): Observable<EmpresaCredoraResponse> {
    return this.http.get<EmpresaCredoraResponse>(`${CREDORES_URL}/me`);
  }

  consultarElegibilidade(): Observable<ElegibilidadeCredoraResponse> {
    return this.http.get<ElegibilidadeCredoraResponse>(`${CREDORES_URL}/me/elegibilidade`);
  }

  listarOportunidades(): Observable<OportunidadeResponse[]> {
    return this.http.get<OportunidadeResponse[]>(OPORTUNIDADES_URL);
  }

  consultarOportunidade(id: string): Observable<OportunidadeResponse> {
    return this.http.get<OportunidadeResponse>(`${OPORTUNIDADES_URL}/${id}`);
  }

  // POST sem corpo: a credora dona vem do usuario autenticado e a oportunidade vai no path.
  registrarInteresse(oportunidadeId: string): Observable<InteresseResponse> {
    return this.http.post<InteresseResponse>(
      `${OPORTUNIDADES_URL}/${oportunidadeId}/interesses`,
      null,
    );
  }

  // DELETE NAO idempotente: 204 quando havia interesse ATIVO; o backend responde 404
  // (InteresseNaoEncontrado) quando nao ha. O service propaga o erro sem mascarar — a UI trata o
  // 404 como "sem interesse ativo".
  cancelarInteresse(oportunidadeId: string): Observable<void> {
    return this.http.delete<void>(`${OPORTUNIDADES_URL}/${oportunidadeId}/interesses/me`);
  }

  listarCarteira(): Observable<OperacaoCarteiraResponse[]> {
    return this.http.get<OperacaoCarteiraResponse[]>(CARTEIRA_URL);
  }

  consultarOperacaoCarteira(id: string): Observable<OperacaoCarteiraResponse> {
    return this.http.get<OperacaoCarteiraResponse>(`${CARTEIRA_URL}/${id}`);
  }
}
