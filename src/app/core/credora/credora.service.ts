import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AporteCredoraResponse,
  CadastrarCredoraRequest,
  DecidirMatchingRequest,
  ElegibilidadeCredoraResponse,
  EmpresaCredoraResponse,
  InteresseResponse,
  MatchingSugestaoResponse,
  OperacaoCarteiraResponse,
  OportunidadeResponse,
  RegistrarAporteRequest,
} from '../api/api.models';

const CREDORES_URL = `${environment.apiBaseUrl}/credores`;
const OPORTUNIDADES_URL = `${CREDORES_URL}/oportunidades`;
const CARTEIRA_URL = `${CREDORES_URL}/carteira`;
const MATCHING_URL = `${CREDORES_URL}/matching`;
const OPERACOES_URL = `${CREDORES_URL}/operacoes`;

// Transporte HTTP da jornada credora (Epic 10 / backend Sprints 16-17): cadastro a partir de
// onboarding PJ aprovado, perfil/elegibilidade, oportunidades, interesse e carteira. A F-Sprint 18
// (backend Sprints 29-30) acrescenta matching assistido e aporte assistido. Elegibilidade,
// ownership, unicidade de interesse, associacao de carteira, estados de matching/aporte,
// idempotencia e auditoria pertencem ao backend; o service apenas propaga os DTOs e headers e nunca
// recalcula regra de negocio. O X-Step-Up-Token dos POSTs sensiveis (decisao de matching e aporte)
// e anexado pelo stepUpInterceptor, nao aqui.
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

  // GET refresh-on-read (FINANCEIRO/ADMIN): o backend pode persistir e auditar sugestoes novas
  // antes de listar as SUGERIDA. Nao e leitura pura — o consumidor so chama por gesto explicito,
  // nunca por polling.
  listarSugestoesMatching(): Observable<MatchingSugestaoResponse[]> {
    return this.http.get<MatchingSugestaoResponse[]>(`${MATCHING_URL}/sugestoes`);
  }

  consultarMatching(sugestaoId: string): Observable<MatchingSugestaoResponse> {
    return this.http.get<MatchingSugestaoResponse>(`${MATCHING_URL}/${sugestaoId}`);
  }

  // POST com step-up estrito (via interceptor). Decisao terminal/repetida responde 409; confirmar
  // apenas registra a decisao — nenhum aporte e criado.
  decidirMatching(
    sugestaoId: string,
    request: DecidirMatchingRequest,
  ): Observable<MatchingSugestaoResponse> {
    return this.http.post<MatchingSugestaoResponse>(
      `${MATCHING_URL}/${sugestaoId}/decisao`,
      request,
    );
  }

  // POST com step-up estrito (via interceptor) e Idempotency-Key obrigatoria. A key e gerada pelo
  // chamador por intencao de aporte; o service so a transporta. 201 = registro novo, 200 = replay
  // idempotente — ambos entregues no mesmo canal de sucesso.
  registrarAporte(
    operacaoId: string,
    request: RegistrarAporteRequest,
    idempotencyKey: string,
  ): Observable<AporteCredoraResponse> {
    return this.http.post<AporteCredoraResponse>(
      `${OPERACOES_URL}/${operacaoId}/aportes`,
      request,
      {
        headers: { 'Idempotency-Key': idempotencyKey },
      },
    );
  }

  // GET owner-scoped sem step-up: financeiro/admin veem qualquer operacao; a credora dona ve
  // somente a propria. 404 neutro para usuario sem credora, operacao alheia ou inexistente.
  listarAportes(operacaoId: string): Observable<AporteCredoraResponse[]> {
    return this.http.get<AporteCredoraResponse[]>(`${OPERACOES_URL}/${operacaoId}/aportes`);
  }
}
