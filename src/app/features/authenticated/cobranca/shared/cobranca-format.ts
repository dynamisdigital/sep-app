import { HttpErrorResponse } from '@angular/common/http';

import { mensagemDeErroDaApi } from '../../../../core/api/api-error';

import { StatusParcela, StatusRenegociacao } from '../../../../core/api/api.models';

import { formatarDataIso } from '../../../../core/format/data';

// Formatacao apenas visual da jornada de cobranca. Valores chegam como number BRL e
// datas como string do backend; nada aqui interpreta regra de negocio (saldo, mora,
// multa, status e transicoes pertencem ao backend).

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// Datas com horario (OffsetDateTime ISO, ex.: dataGeracao da agenda).
export function formatarData(iso: string): string {
  return formatarDataIso(iso, { dateStyle: 'short' });
}

// Datas sem horario (LocalDate 'yyyy-MM-dd', ex.: vencimento). Nao usa `Date` — e portanto
// nao usa o `formatarDataIso` — porque `new Date('2026-09-14')` e lido como UTC e volta um
// dia num fuso a oeste. Mesmo contrato da FMF-4.1 com outra tecnica: so o formato exato
// vira dd/MM/yyyy, o resto volta verbatim e o ausente vira vazio.
//
// A ancora `$` e material: sem ela um OffsetDateTime casaria o prefixo e a tela mostraria o
// dia descartando o horario em silencio.
export function formatarDataLocal(isoDate: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (partes === null) {
    return isoDate ?? '';
  }
  const [, ano, mes, dia] = partes;
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

// Label curto por status de renegociacao apresentado ao tomador (F-16). A proposta
// consultavel e sempre PROPOSTA; os demais cobrem estados historicos/terminais.
export const STATUS_RENEGOCIACAO_LABEL: Record<StatusRenegociacao, string> = {
  PROPOSTA: 'Aguardando sua decisao',
  ACEITA: 'Aceita',
  RECUSADA: 'Recusada',
  EXPIRADA: 'Expirada',
};

// Extrai a mensagem amigavel do corpo de erro padronizado da API, com fallback.
// 401/403/423 sao tratados pelo errorInterceptor global (redirecionamento); aqui
// cobrimos 404/409/422/5xx como fallback defensivo.
export function mensagemCobrancaErro(err: HttpErrorResponse, padrao: string): string {
  return mensagemDeErroDaApi(err, padrao);
}
