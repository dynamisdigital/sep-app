import { HttpErrorResponse } from '@angular/common/http';

import {
  ApiErrorResponse,
  StatusEnvelope,
  StatusFormalizacao,
} from '../../../../core/api/api.models';

// Formatacao apenas visual da jornada de formalizacao. Valores chegam como number
// BRL e datas como string ISO do backend; nada aqui interpreta regra de negocio.

export function formatarMoeda(valor: number, moeda: string): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(valor);
}

export function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso));
}

// Sufixo do UUID para identificacao curta em listas (o id completo permanece no link).
export function idCurto(id: string): string {
  return id.slice(-8);
}

// Label operacional curto por status de formalizacao. A tela apenas apresenta;
// as transicoes de estado pertencem ao backend.
export const STATUS_FORMALIZACAO_LABEL: Record<StatusFormalizacao, string> = {
  GERADO: 'Gerado',
  AGUARDANDO_ACEITE: 'Aguardando aceite',
  ACEITO: 'Aceito',
  EM_ASSINATURA: 'Em assinatura',
  ASSINADO: 'Assinado',
  RECUSADO: 'Recusado',
  CANCELADO: 'Cancelado',
};

// Label do envelope de assinatura no provider. A tela apenas apresenta o estado
// retornado; nao consulta o provider externo nem decide transicoes.
export const STATUS_ENVELOPE_LABEL: Record<StatusEnvelope, string> = {
  RASCUNHO: 'Rascunho',
  ENVIADO: 'Enviado para assinatura',
  VISUALIZADO: 'Visualizado',
  ASSINADO: 'Assinado',
  RECUSADO: 'Recusado',
  EXPIRADO: 'Expirado',
};

// Extrai a mensagem amigavel do corpo de erro padronizado da API, com fallback.
// 401/403/423 sao tratados pelo errorInterceptor global (redirecionamento); aqui
// cobrimos 404/409/422/5xx e servem de fallback defensivo.
export function mensagemFormalizacaoErro(err: HttpErrorResponse, padrao: string): string {
  const apiErr = err.error as ApiErrorResponse | undefined;
  return apiErr?.message ?? padrao;
}
