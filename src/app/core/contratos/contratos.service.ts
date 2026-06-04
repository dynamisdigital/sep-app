import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ContratoResponse,
  StatusAssinaturaResponse,
  VersaoContratoResponse,
} from '../api/api.models';

const CONTRATOS_URL = `${environment.apiBaseUrl}/contratos`;

// Orquestra apenas o transporte HTTP da formalizacao contratual. Versionamento,
// hashes, geracao de PDF/CCB, assinatura provider e transicoes de estado pertencem
// ao backend; o service propaga os DTOs sem interpreta-los como regra de negocio.
//
// O aceite e operacao sensivel (@RequireStepUp no backend). O token de step-up nao
// e responsabilidade deste service: e coletado no fluxo de step-up, guardado no
// StepUpTokenStore e anexado como X-Step-Up-Token pelo stepUpInterceptor. Manter o
// transporte do token centralizado no interceptor preserva o padrao do projeto.
@Injectable({ providedIn: 'root' })
export class ContratosService {
  private readonly http = inject(HttpClient);

  consultarContrato(id: string): Observable<ContratoResponse> {
    return this.http.get<ContratoResponse>(`${CONTRATOS_URL}/${id}`);
  }

  consultarContratoPorProposta(propostaId: string): Observable<ContratoResponse> {
    return this.http.get<ContratoResponse>(`${CONTRATOS_URL}/proposta/${propostaId}`);
  }

  listarVersoes(contratoId: string): Observable<VersaoContratoResponse[]> {
    return this.http.get<VersaoContratoResponse[]>(`${CONTRATOS_URL}/${contratoId}/versoes`);
  }

  // Corpo vazio reservado (RegistrarAceiteRequest); retorna o contrato ja atualizado
  // pelo backend para o detalhe refletir o novo estado sem segunda chamada.
  registrarAceite(contratoId: string): Observable<ContratoResponse> {
    return this.http.patch<ContratoResponse>(`${CONTRATOS_URL}/${contratoId}/aceite`, {});
  }

  consultarStatusAssinatura(contratoId: string): Observable<StatusAssinaturaResponse> {
    return this.http.get<StatusAssinaturaResponse>(
      `${CONTRATOS_URL}/${contratoId}/assinatura/status`,
    );
  }

  // Preserva a resposta completa (observe: 'response') para ler X-Document-Hash-Sha256
  // e Content-Disposition. O PDF e tratado como Blob transitorio pelo chamador.
  baixarDocumentoAssinado(contratoId: string): Observable<HttpResponse<Blob>> {
    return this.http.get(`${CONTRATOS_URL}/${contratoId}/documento-assinado`, {
      observe: 'response',
      responseType: 'blob',
    });
  }
}
