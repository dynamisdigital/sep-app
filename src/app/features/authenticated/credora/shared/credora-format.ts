import { HttpErrorResponse } from '@angular/common/http';

import { extrairMensagemErroSegura } from '../../../../core/api/api-error-sanitizer';
import { TipoCredora } from '../../../../core/api/api.models';

// Formatacao apenas visual da jornada credora. Valores chegam como number BRL; elegibilidade,
// status cadastral e mascaramento de CNPJ pertencem ao backend — nada aqui interpreta regra de
// negocio.

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// Data do backend (OffsetDateTime/LocalDate ISO) apenas para exibicao. LocalDate ("2026-06-25")
// seria interpretado como meia-noite UTC e apareceria um dia antes em fuso negativo; por isso a
// data pura e ancorada no fuso local antes de formatar.
export function formatarData(iso: string): string {
  const dataPura = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(
    new Date(dataPura ? `${iso}T00:00:00` : iso),
  );
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

// Mensagem amigavel do corpo de erro padronizado da API, com fallback e sanitizacao. 401/403/423 globais sao
// tratados pelo errorInterceptor; aqui os componentes cobrem os erros de dominio da credora.
export function mensagemCredoraErro(err: HttpErrorResponse, padrao: string): string {
  return extrairMensagemErroSegura(err, padrao);
}
