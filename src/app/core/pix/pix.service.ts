import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TRATA_403_LOCALMENTE } from '../interceptors/error.interceptor';
import {
  CadastrarChavePixRequest,
  ChavePixResponse,
  GerarReferenciaRecebimentoPixRequest,
  PixDesembolsoResponse,
  PixRecebimentoResponse,
  PixReferenciaRecebimentoResponse,
  PixStatusDesembolsoResponse,
  SolicitarDesembolsoPixRequest,
} from '../api/api.models';

const DESEMBOLSOS_URL = `${environment.apiBaseUrl}/pix/desembolsos`;
const RECEBIMENTOS_URL = `${environment.apiBaseUrl}/pix/recebimentos`;
const CHAVES_URL = `${environment.apiBaseUrl}/pix/chaves`;

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

  // Leitura local das chaves da conta operacional (F-20.1 / backend Sprint 31): sempre mascarada,
  // incluindo o historico INATIVA, mais recentes primeiro. Sem step-up e sem Idempotency-Key; nunca
  // retorna 404 (conta operacional ausente devolve lista vazia).
  listarChavesPix(): Observable<ChavePixResponse[]> {
    return this.http.get<ChavePixResponse[]>(CHAVES_URL);
  }

  // POST com step-up estrito (anexado pelo stepUpInterceptor) e Idempotency-Key obrigatoria. A key
  // e gerada pelo chamador por intencao de cadastro; o service so a transporta. 201 = registro
  // novo, 200 = replay idempotente — ambos chegam pelo mesmo canal de sucesso. O 403 (MFA inativo
  // ou step-up invalido) e tratado na propria tela, sem o redirect global do errorInterceptor.
  cadastrarChavePix(
    request: CadastrarChavePixRequest,
    idempotencyKey: string,
  ): Observable<ChavePixResponse> {
    return this.http.post<ChavePixResponse>(CHAVES_URL, request, {
      headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
      context: tratando403NaTela(),
    });
  }

  // DELETE com step-up estrito (via interceptor). Inativacao logica idempotente: 204 mesmo quando
  // a chave ja estava INATIVA. O 404 e neutro por contrato — nao distingue chave inexistente, fora
  // do escopo da conta operacional ou conta ausente. Sem Idempotency-Key.
  removerChavePix(chaveId: string): Observable<void> {
    return this.http.delete<void>(`${CHAVES_URL}/${chaveId}`, { context: tratando403NaTela() });
  }
}

// As mutacoes de chave Pix tratam o 403 de step-up na propria tela (padrao F-16/F-18); o
// errorInterceptor nao deve ejetar o operador para /access-denied.
function tratando403NaTela(): HttpContext {
  return new HttpContext().set(TRATA_403_LOCALMENTE, true);
}
