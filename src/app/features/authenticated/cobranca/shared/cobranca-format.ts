import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorResponse, StatusParcela } from '../../../../core/api/api.models';

// Formatacao apenas visual da jornada de cobranca. Valores chegam como number BRL e
// datas como string do backend; nada aqui interpreta regra de negocio (saldo, mora,
// multa, status e transicoes pertencem ao backend).

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// Datas com horario (OffsetDateTime ISO, ex.: dataGeracao da agenda).
export function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso));
}

// Datas sem horario (LocalDate 'yyyy-MM-dd', ex.: vencimento). Formatado sem Date
// para evitar deslocamento de fuso (Date interpreta 'yyyy-MM-dd' como UTC).
export function formatarDataLocal(isoDate: string): string {
  const [ano, mes, dia] = isoDate.split('-');
  return `${dia}/${mes}/${ano}`;
}

// Sufixo do UUID para identificacao curta em listas (o id completo segue no link).
export function idCurto(id: string): string {
  return id.slice(-8);
}

// Label operacional curto por status de parcela. A tela apenas apresenta; as
// transicoes de estado pertencem ao backend.
export const STATUS_PARCELA_LABEL: Record<StatusParcela, string> = {
  PENDENTE: 'Pendente',
  PARCIALMENTE_PAGA: 'Parcialmente paga',
  PAGA: 'Paga',
  ATRASADA: 'Atrasada',
  INADIMPLENTE: 'Inadimplente',
  EM_NEGOCIACAO: 'Em negociacao',
  RENEGOCIADA: 'Renegociada',
};

// Extrai a mensagem amigavel do corpo de erro padronizado da API, com fallback.
// 401/403/423 sao tratados pelo errorInterceptor global (redirecionamento); aqui
// cobrimos 404/409/422/5xx como fallback defensivo.
export function mensagemCobrancaErro(err: HttpErrorResponse, padrao: string): string {
  const apiErr = err.error as ApiErrorResponse | undefined;
  return apiErr?.message ?? padrao;
}
