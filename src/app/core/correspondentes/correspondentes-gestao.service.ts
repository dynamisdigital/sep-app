import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AtualizarMetaRequest,
  AtualizarRegraRequest,
  ComissoesResponse,
  CriarInteracaoRequest,
  CriarProspectRequest,
  DesempenhoRedeResponse,
  EventoAuditoria,
  InteracaoResponse,
  LancamentoComissao,
  MetaCorrespondente,
  MeuDesempenhoResponse,
  MoverEtapaRequest,
  ProspectResponse,
  RegraComissao,
} from './correspondentes-gestao.models';

const BASE = `${environment.apiBaseUrl}/correspondentes`;

// Transporte HTTP da gestao comercial. Isolamento por correspondente, versionamento das regras de
// comissao e auditoria sao do backend; as rotas /me nao recebem identificador.
@Injectable({ providedIn: 'root' })
export class CorrespondentesGestaoService {
  private readonly http = inject(HttpClient);

  // Correspondente: funil
  listarProspects(): Observable<ProspectResponse[]> {
    return this.http.get<ProspectResponse[]>(`${BASE}/me/prospects`);
  }

  criarProspect(body: CriarProspectRequest): Observable<ProspectResponse> {
    return this.http.post<ProspectResponse>(`${BASE}/me/prospects`, body);
  }

  moverEtapa(id: string, body: MoverEtapaRequest): Observable<ProspectResponse> {
    return this.http.patch<ProspectResponse>(`${BASE}/me/prospects/${id}/etapa`, body);
  }

  // Correspondente: agenda
  listarInteracoes(): Observable<InteracaoResponse[]> {
    return this.http.get<InteracaoResponse[]>(`${BASE}/me/interacoes`);
  }

  criarInteracao(body: CriarInteracaoRequest): Observable<InteracaoResponse> {
    return this.http.post<InteracaoResponse>(`${BASE}/me/interacoes`, body);
  }

  concluirInteracao(id: string): Observable<InteracaoResponse> {
    return this.http.post<InteracaoResponse>(`${BASE}/me/interacoes/${id}/concluir`, {});
  }

  // Correspondente: comissoes e desempenho
  consultarMinhasComissoes(): Observable<ComissoesResponse> {
    return this.http.get<ComissoesResponse>(`${BASE}/me/comissoes`);
  }

  consultarMeuDesempenho(): Observable<MeuDesempenhoResponse> {
    return this.http.get<MeuDesempenhoResponse>(`${BASE}/me/desempenho`);
  }

  // Administracao
  listarRegras(): Observable<RegraComissao[]> {
    return this.http.get<RegraComissao[]>(`${BASE}/comissoes/regras`);
  }

  atualizarRegra(id: string, body: AtualizarRegraRequest): Observable<RegraComissao> {
    return this.http.put<RegraComissao>(`${BASE}/comissoes/regras/${id}`, body);
  }

  listarLancamentosDaRede(): Observable<LancamentoComissao[]> {
    return this.http.get<LancamentoComissao[]>(`${BASE}/comissoes/lancamentos`);
  }

  consultarDesempenhoDaRede(): Observable<DesempenhoRedeResponse> {
    return this.http.get<DesempenhoRedeResponse>(`${BASE}/desempenho`);
  }

  atualizarMeta(
    correspondenteId: string,
    body: AtualizarMetaRequest,
  ): Observable<MetaCorrespondente> {
    return this.http.put<MetaCorrespondente>(`${BASE}/metas/${correspondenteId}`, body);
  }

  listarAuditoria(): Observable<EventoAuditoria[]> {
    return this.http.get<EventoAuditoria[]>(`${BASE}/auditoria`);
  }
}
