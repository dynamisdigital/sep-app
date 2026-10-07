import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  CorrespondenteResponse,
  EnviarDocumentosRequest,
  EnvioDocumentosResponse,
  OperacaoClienteResponse,
  ProcessarVigenciaResponse,
  RedeResumoResponse,
  ReatribuirVinculoRequest,
  RenovarCadastroRequest,
  ResumoCorrespondenteResponse,
  ValidarEnvioRequest,
  VinculoResponse,
} from './correspondentes.models';

const BASE = `${environment.apiBaseUrl}/correspondentes`;
const BACKOFFICE_ENVIOS = `${environment.apiBaseUrl}/backoffice/correspondentes/envios`;

// Transporte HTTP do modulo. Vigencia, perda de base, ownership e validacao sao do backend; o
// isolamento da base do correspondente vem do token (nunca de parametro), entao as rotas /me nao
// recebem identificador.
@Injectable({ providedIn: 'root' })
export class CorrespondentesService {
  private readonly http = inject(HttpClient);

  // Area administrativa (ADMIN)
  consultarRede(): Observable<RedeResumoResponse> {
    return this.http.get<RedeResumoResponse>(BASE);
  }

  consultarCorrespondente(id: string): Observable<CorrespondenteResponse> {
    return this.http.get<CorrespondenteResponse>(`${BASE}/${id}`);
  }

  listarVinculos(id: string): Observable<VinculoResponse[]> {
    return this.http.get<VinculoResponse[]>(`${BASE}/${id}/vinculos`);
  }

  renovarCadastro(id: string, body: RenovarCadastroRequest): Observable<CorrespondenteResponse> {
    return this.http.post<CorrespondenteResponse>(`${BASE}/${id}/renovar-cadastro`, body);
  }

  reatribuirVinculo(
    vinculoId: string,
    body: ReatribuirVinculoRequest,
  ): Observable<VinculoResponse> {
    return this.http.post<VinculoResponse>(`${BASE}/vinculos/${vinculoId}/reatribuir`, body);
  }

  // Simulacao: em producao a apuracao de vigencia e um job do backend, nao uma acao de tela.
  processarVigencia(): Observable<ProcessarVigenciaResponse> {
    return this.http.post<ProcessarVigenciaResponse>(`${BASE}/vigencia/processar`, {});
  }

  // Area do correspondente (CORRESPONDENTE): sempre a propria base, resolvida pelo token.
  consultarMeuResumo(): Observable<ResumoCorrespondenteResponse> {
    return this.http.get<ResumoCorrespondenteResponse>(`${BASE}/me/resumo`);
  }

  listarMinhaBase(): Observable<VinculoResponse[]> {
    return this.http.get<VinculoResponse[]>(`${BASE}/me/base`);
  }

  listarMinhasOperacoes(): Observable<OperacaoClienteResponse[]> {
    return this.http.get<OperacaoClienteResponse[]>(`${BASE}/me/operacoes`);
  }

  listarMeusEnvios(): Observable<EnvioDocumentosResponse[]> {
    return this.http.get<EnvioDocumentosResponse[]>(`${BASE}/me/envios`);
  }

  enviarDocumentos(body: EnviarDocumentosRequest): Observable<EnvioDocumentosResponse> {
    return this.http.post<EnvioDocumentosResponse>(`${BASE}/me/envios`, body);
  }

  // Backoffice: envios entram na fila e o backoffice decide.
  listarEnviosParaValidacao(): Observable<EnvioDocumentosResponse[]> {
    return this.http.get<EnvioDocumentosResponse[]>(BACKOFFICE_ENVIOS);
  }

  validarEnvio(id: string, body: ValidarEnvioRequest): Observable<EnvioDocumentosResponse> {
    return this.http.post<EnvioDocumentosResponse>(`${BACKOFFICE_ENVIOS}/${id}/validar`, body);
  }
}
