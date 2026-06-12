import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorResponse, TipoCredora } from '../../../../core/api/api.models';

// Formatacao apenas visual da jornada credora. Valores chegam como number BRL; elegibilidade,
// status cadastral e mascaramento de CNPJ pertencem ao backend — nada aqui interpreta regra de
// negocio.

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// Data do backend (OffsetDateTime/LocalDate ISO) apenas para exibicao.
export function formatarData(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso));
}

// Sufixo do UUID para identificacao curta em listas (o id completo permanece no link).
export function idCurto(id: string): string {
  return id.slice(-8);
}

// Taxa mensal vem como fracao (ex.: 0.025 = 2,50%). Formata como percentual ao mes para exibicao.
export function formatarTaxaMensal(taxa: number): string {
  const percentual = new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(taxa);
  return `${percentual} a.m.`;
}

// Label legivel da natureza da credora (TipoCredora no backend).
export const TIPO_CREDORA_LABEL: Record<TipoCredora, string> = {
  EMPRESA: 'Empresa',
  INSTITUICAO_FINANCEIRA: 'Instituicao financeira',
};

// Mensagem amigavel do corpo de erro padronizado da API, com fallback. 401/403/423 globais sao
// tratados pelo errorInterceptor; aqui os componentes cobrem os erros de dominio da credora.
export function mensagemCredoraErro(err: HttpErrorResponse, padrao: string): string {
  const apiErr = err.error as ApiErrorResponse | undefined;
  return apiErr?.message ?? padrao;
}
