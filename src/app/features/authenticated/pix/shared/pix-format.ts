import { HttpErrorResponse } from '@angular/common/http';

import { mensagemDeErroDaApi } from '../../../../core/api/api-error';

import {
  StatusChavePix,
  StatusPixRecebimento,
  StatusPixReferenciaRecebimento,
  StatusPixTransferencia,
  TipoChavePix,
} from '../../../../core/api/api.models';

// Formatacao apenas visual da jornada Pix. Valores chegam como number BRL; nada aqui interpreta
// regra de negocio (elegibilidade, status, conciliacao e mascaramento pertencem ao backend).

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// Data/hora do backend (OffsetDateTime ISO, ex.: recebidoEm).
export function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

// Sufixo do UUID para identificacao curta na tela (o id completo segue no path/link).
export function idCurto(id: string): string {
  return id.slice(-8);
}

// Label operacional curto por status de transferencia. A tela apenas apresenta; as
// transicoes de estado pertencem ao backend.
export const STATUS_TRANSFERENCIA_LABEL: Record<StatusPixTransferencia, string> = {
  CRIADA: 'Criada',
  SOLICITADA: 'Solicitada',
  PROCESSANDO: 'Processando',
  CONCLUIDA: 'Concluida',
  FALHOU: 'Falhou',
  CANCELADA: 'Cancelada',
};

// Label por status de referencia Pix de recebimento.
export const STATUS_REFERENCIA_LABEL: Record<StatusPixReferenciaRecebimento, string> = {
  ATIVA: 'Ativa',
  PAGA: 'Paga',
  EXPIRADA: 'Expirada',
  CANCELADA: 'Cancelada',
  DIVERGENTE: 'Divergente',
};

// Label por status de recebimento Pix.
export const STATUS_RECEBIMENTO_LABEL: Record<StatusPixRecebimento, string> = {
  RECEBIDO: 'Recebido',
  EM_PROCESSAMENTO: 'Em processamento',
  CONCILIADO: 'Conciliado',
  NAO_IDENTIFICADO: 'Nao identificado',
  FALHOU: 'Falhou',
};

// Label por tipo de chave Pix da conta operacional. EVP e o termo do DICT para a chave
// aleatoria; o rotulo explicita isso sem renomear o valor do contrato.
export const TIPO_CHAVE_LABEL: Record<TipoChavePix, string> = {
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  EMAIL: 'E-mail',
  TELEFONE: 'Telefone',
  EVP: 'Aleatoria (EVP)',
};

// Label por estado da chave Pix. ATIVA -> INATIVA e a unica transicao; a remocao e logica e o
// historico permanece visivel.
export const STATUS_CHAVE_LABEL: Record<StatusChavePix, string> = {
  ATIVA: 'Ativa',
  INATIVA: 'Inativa',
};

// Extrai a mensagem amigavel do corpo de erro padronizado da API, com fallback. 401/403/423
// globais sao tratados pelo errorInterceptor/fluxo de step-up; aqui cobrimos 404/409/422/5xx.
export function mensagemPixErro(err: HttpErrorResponse, padrao: string): string {
  return mensagemDeErroDaApi(err, padrao);
}
