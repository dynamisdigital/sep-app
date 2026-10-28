import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AlocacaoRequest,
  AlocacaoResponse,
  AlterarStatusCredorRequest,
  AporteResponse,
  CategoriaInvestidor,
  ContaEscrowResponse,
  CredorGestaoResponse,
  DestinatarioRequest,
  DestinatarioResponse,
  DivergenciaEscrow,
  EventoAuditoriaCredor,
  LancamentoEscrow,
  LimiteDevedorResponse,
  OperacaoEscrowResponse,
  OportunidadeAlocavelResponse,
  OportunidadeTesourariaResponse,
  PerfilRiscoCredor,
  SaqueRequest,
  SaqueResponse,
  StatusCredorGestao,
  TesourariaResumoResponse,
} from './credores-escrow.models';

const CREDOR_URL = `${environment.apiBaseUrl}/credores/me`;
const GESTAO_URL = `${environment.apiBaseUrl}/backoffice/credores`;
const TESOURARIA_URL = `${environment.apiBaseUrl}/backoffice/tesouraria`;

const comChave = (idempotencyKey: string) => ({
  headers: new HttpHeaders({ 'Idempotency-Key': idempotencyKey }),
});

// Transporte HTTP da conta escrow do credor e da gestao de credores. Saldo, limite por devedor,
// rateio e prazos sao do backend (regras em escrow-ledger.ts documentam o contrato esperado). As
// operacoes que movem dinheiro (aporte, alocacao, saque, aprovacao, desembolso e repasse) levam
// `Idempotency-Key`, gerada por tentativa pelo componente; saque e aprovacao exigem step-up, anexado
// pelo stepUpInterceptor.
@Injectable({ providedIn: 'root' })
export class CredoresEscrowService {
  private readonly http = inject(HttpClient);

  // ---------- Credor: conta, aporte e extrato ----------
  consultarConta(): Observable<ContaEscrowResponse> {
    return this.http.get<ContaEscrowResponse>(`${CREDOR_URL}/escrow`);
  }

  listarExtrato(): Observable<LancamentoEscrow[]> {
    return this.http.get<LancamentoEscrow[]>(`${CREDOR_URL}/escrow/extrato`);
  }

  listarAportes(): Observable<AporteResponse[]> {
    return this.http.get<AporteResponse[]>(`${CREDOR_URL}/escrow/aportes`);
  }

  criarAporte(valor: number, idempotencyKey: string): Observable<AporteResponse> {
    return this.http.post<AporteResponse>(
      `${CREDOR_URL}/escrow/aportes`,
      { valor },
      comChave(idempotencyKey),
    );
  }

  /** Somente no mock: simula o webhook de deposito confirmado enviado pelo parceiro. */
  simularConfirmacaoAporte(id: string): Observable<AporteResponse> {
    return this.http.post<AporteResponse>(
      `${CREDOR_URL}/escrow/aportes/${id}/simular-confirmacao`,
      null,
    );
  }

  // ---------- Credor: alocacao ----------
  listarAlocacoes(): Observable<AlocacaoResponse[]> {
    return this.http.get<AlocacaoResponse[]>(`${CREDOR_URL}/alocacoes`);
  }

  alocar(pedido: AlocacaoRequest, idempotencyKey: string): Observable<AlocacaoResponse> {
    return this.http.post<AlocacaoResponse>(
      `${CREDOR_URL}/alocacoes`,
      pedido,
      comChave(idempotencyKey),
    );
  }

  cancelarAlocacao(id: string): Observable<void> {
    return this.http.delete<void>(`${CREDOR_URL}/alocacoes/${id}`);
  }

  listarOportunidadesAlocaveis(): Observable<OportunidadeAlocavelResponse[]> {
    return this.http.get<OportunidadeAlocavelResponse[]>(`${CREDOR_URL}/oportunidades`);
  }

  consultarLimite(oportunidadeId: string): Observable<LimiteDevedorResponse> {
    return this.http.get<LimiteDevedorResponse>(`${CREDOR_URL}/limites/${oportunidadeId}`);
  }

  // ---------- Credor: destinatarios e saque ----------
  listarDestinatarios(): Observable<DestinatarioResponse[]> {
    return this.http.get<DestinatarioResponse[]>(`${CREDOR_URL}/destinatarios`);
  }

  criarDestinatario(pedido: DestinatarioRequest): Observable<DestinatarioResponse> {
    return this.http.post<DestinatarioResponse>(`${CREDOR_URL}/destinatarios`, pedido);
  }

  removerDestinatario(id: string): Observable<void> {
    return this.http.delete<void>(`${CREDOR_URL}/destinatarios/${id}`);
  }

  listarSaques(): Observable<SaqueResponse[]> {
    return this.http.get<SaqueResponse[]>(`${CREDOR_URL}/saques`);
  }

  solicitarSaque(pedido: SaqueRequest, idempotencyKey: string): Observable<SaqueResponse> {
    return this.http.post<SaqueResponse>(`${CREDOR_URL}/saques`, pedido, comChave(idempotencyKey));
  }

  // ---------- Backoffice: gestao de credores ----------
  listarCredores(status?: StatusCredorGestao): Observable<CredorGestaoResponse[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<CredorGestaoResponse[]>(GESTAO_URL, { params });
  }

  consultarCredor(id: string): Observable<CredorGestaoResponse> {
    return this.http.get<CredorGestaoResponse>(`${GESTAO_URL}/${id}`);
  }

  listarExtratoDoCredor(id: string): Observable<LancamentoEscrow[]> {
    return this.http.get<LancamentoEscrow[]>(`${GESTAO_URL}/${id}/extrato`);
  }

  listarAuditoria(id: string): Observable<EventoAuditoriaCredor[]> {
    return this.http.get<EventoAuditoriaCredor[]>(`${GESTAO_URL}/${id}/auditoria`);
  }

  alterarStatus(id: string, pedido: AlterarStatusCredorRequest): Observable<CredorGestaoResponse> {
    return this.http.patch<CredorGestaoResponse>(`${GESTAO_URL}/${id}/status`, pedido);
  }

  alterarPerfilRisco(id: string, perfilRisco: PerfilRiscoCredor): Observable<CredorGestaoResponse> {
    return this.http.patch<CredorGestaoResponse>(`${GESTAO_URL}/${id}/perfil-risco`, {
      perfilRisco,
    });
  }

  alterarCategoria(id: string, categoria: CategoriaInvestidor): Observable<CredorGestaoResponse> {
    return this.http.patch<CredorGestaoResponse>(`${GESTAO_URL}/${id}/categoria`, { categoria });
  }

  // ---------- Backoffice: tesouraria ----------
  consultarResumoTesouraria(): Observable<TesourariaResumoResponse> {
    return this.http.get<TesourariaResumoResponse>(`${TESOURARIA_URL}/resumo`);
  }

  listarDivergencias(): Observable<DivergenciaEscrow[]> {
    return this.http.get<DivergenciaEscrow[]>(`${TESOURARIA_URL}/divergencias`);
  }

  listarOportunidadesTesouraria(): Observable<OportunidadeTesourariaResponse[]> {
    return this.http.get<OportunidadeTesourariaResponse[]>(`${TESOURARIA_URL}/oportunidades`);
  }

  listarOperacoes(): Observable<OperacaoEscrowResponse[]> {
    return this.http.get<OperacaoEscrowResponse[]>(`${TESOURARIA_URL}/operacoes`);
  }

  listarSaquesPendentes(): Observable<SaqueResponse[]> {
    return this.http.get<SaqueResponse[]>(`${TESOURARIA_URL}/saques`);
  }

  aprovarSaque(id: string, idempotencyKey: string): Observable<SaqueResponse> {
    return this.http.post<SaqueResponse>(
      `${TESOURARIA_URL}/saques/${id}/aprovar`,
      null,
      comChave(idempotencyKey),
    );
  }

  rejeitarSaque(id: string): Observable<SaqueResponse> {
    return this.http.post<SaqueResponse>(`${TESOURARIA_URL}/saques/${id}/rejeitar`, null);
  }

  desembolsar(
    oportunidadeId: string,
    operacaoId: string,
    idempotencyKey: string,
  ): Observable<{
    operacaoId: string;
    credores: number;
    total: number;
    repasseAoDevedorAte: string;
  }> {
    return this.http.post<{
      operacaoId: string;
      credores: number;
      total: number;
      repasseAoDevedorAte: string;
    }>(
      `${TESOURARIA_URL}/oportunidades/${oportunidadeId}/desembolsar`,
      { operacaoId },
      comChave(idempotencyKey),
    );
  }

  encerrarSemFormar(
    oportunidadeId: string,
    motivo: string,
  ): Observable<{ devolvidas: number; devolverAte: string }> {
    return this.http.post<{ devolvidas: number; devolverAte: string }>(
      `${TESOURARIA_URL}/oportunidades/${oportunidadeId}/encerrar`,
      { motivo },
    );
  }

  repassarParcela(
    operacaoId: string,
    numero: number,
    parcela: { principal: number; juros: number },
    idempotencyKey: string,
  ): Observable<{
    operacaoId: string;
    parcela: number;
    quinhoes: { credorId: string; principal: number; juros: number; total: number }[];
    repasseAoCredorAte: string;
  }> {
    return this.http.post<{
      operacaoId: string;
      parcela: number;
      quinhoes: { credorId: string; principal: number; juros: number; total: number }[];
      repasseAoCredorAte: string;
    }>(
      `${TESOURARIA_URL}/operacoes/${operacaoId}/parcelas/${numero}/repasse`,
      parcela,
      comChave(idempotencyKey),
    );
  }
}
