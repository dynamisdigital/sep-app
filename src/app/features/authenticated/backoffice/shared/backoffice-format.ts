import { HttpErrorResponse } from '@angular/common/http';

import { mensagemDeErroDaApi } from '../../../../core/api/api-error';

import {
  PrioridadeItem,
  StatusItemFila,
  StatusReprocesso,
  TipoChamadaProvider,
  TipoEntidadeReferenciada,
  TipoItemFila,
} from '../../../../core/api/api.models';

// Formatacao apenas visual da operacao de backoffice. Valores chegam como number BRL,
// datas como string ISO e a duracao como string ISO-8601 (`Duration` do backend); nada
// aqui interpreta regra de negocio (contadores, medias e somatorios vem do backend).

export function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

// Instant ISO (ex.: geradoEm do dashboard) com data e hora.
export function formatarDataHora(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso),
  );
}

/**
 * O `Duration` do backend chega como **string ISO-8601** (`"PT2H"`), nao como numero de segundos —
 * o `JacksonAutoConfiguration` do Spring Boot desliga `WRITE_DURATIONS_AS_TIMESTAMPS`. Medido na
 * Sprint 34; o comentario que dizia "numero de segundos" era a origem do `NaNmin` que esta funcao
 * renderizava desde sempre, porque `"PT2H"` e truthy, `"PT2H" <= 0` e falso e `Math.round("PT2H"/60)`
 * da `NaN`.
 *
 * `java.time.Duration.toString()` nunca usa o componente de dias: `Duration.ofDays(2)` sai `"PT48H"`.
 * Por isso o formato aceito e so `PT[nH][nM][nS]`, e nao o ISO-8601 completo — parsear o que o
 * produtor nao emite seria complexidade sem caso de uso, e uma dependencia nova aqui, menos ainda.
 */
const DURACAO_ISO = /^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/;

/** Segundos da duracao, ou `null` quando a entrada nao e uma duracao ISO-8601 utilizavel. */
function segundosDaDuracaoIso(duracaoIso: string): number | null {
  // `typeof` e nao so um truthy check: o payload e `unknown` na pratica, e um numero vindo de um
  // backend antigo (ou do mock) casaria com o tipo declarado mas quebraria o `exec`.
  if (typeof duracaoIso !== 'string') {
    return null;
  }
  const partes = DURACAO_ISO.exec(duracaoIso);
  // `"PT"` sozinho casa o regex com todos os grupos vazios: e sintaxe valida e duracao nenhuma.
  if (!partes || (!partes[1] && !partes[2] && !partes[3])) {
    return null;
  }
  return Number(partes[1] ?? 0) * 3600 + Number(partes[2] ?? 0) * 60 + Number(partes[3] ?? 0);
}

// Formata a duracao ISO-8601 do backend para leitura operacional.
export function formatarDuracao(duracaoIso: string): string {
  const segundos = segundosDaDuracaoIso(duracaoIso);
  // `null` (nao parseavel) e `PT0S` caem no mesmo travessao. O zero e valor REAL de producao:
  // `ConsultarVisaoConsolidadaUseCase` devolve `Duration.ZERO` quando nao ha amostra no periodo,
  // e "sem dados" e exatamente o que o travessao comunica.
  if (segundos === null || segundos <= 0) {
    return '—';
  }
  const totalMinutos = Math.round(segundos / 60);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  if (horas > 0 && minutos > 0) {
    return `${horas}h ${minutos}min`;
  }
  if (horas > 0) {
    return `${horas}h`;
  }
  return `${minutos}min`;
}

// Labels operacionais. A tela apenas apresenta; as transicoes de estado pertencem ao backend.
export const TIPO_ITEM_FILA_LABEL: Record<TipoItemFila, string> = {
  ONBOARDING_PENDENTE: 'Onboarding pendente',
  ONBOARDING_ERRO: 'Onboarding com erro',
  PROPOSTA_PENDENTE: 'Proposta pendente',
  CONTRATO_NAO_ASSINADO: 'Contrato nao assinado',
  COBRANCA_INADIMPLENTE: 'Cobranca inadimplente',
  WEBHOOK_FALHOU: 'Webhook falhou',
  DESEMBOLSO_PIX_FALHOU: 'Desembolso Pix falhou',
  RECEBIMENTO_PIX_DIVERGENTE: 'Recebimento Pix divergente',
  OUTRO: 'Outro',
};

export const PRIORIDADE_ITEM_LABEL: Record<PrioridadeItem, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Media',
  ALTA: 'Alta',
  CRITICA: 'Critica',
};

export const STATUS_ITEM_FILA_LABEL: Record<StatusItemFila, string> = {
  ABERTO: 'Aberto',
  EM_TRATAMENTO: 'Em tratamento',
  RESOLVIDO: 'Resolvido',
  IGNORADO: 'Ignorado',
};

export const TIPO_ENTIDADE_LABEL: Record<TipoEntidadeReferenciada, string> = {
  ONBOARDING: 'Onboarding',
  PROPOSTA: 'Proposta',
  CONTRATO: 'Contrato',
  PARCELA_COBRANCA: 'Parcela de cobranca',
  WEBHOOK_EVENT_LOG: 'Webhook',
  PIX_TRANSFERENCIA: 'Transferencia Pix',
  PIX_RECEBIMENTO: 'Recebimento Pix',
  OUTRO: 'Outro',
};

// Categorias de reprocesso de provider. PIX_TRANSFERENCIA tem reconsulta real de status;
// os demais podem ser stubs no backend — a UI nao promete retentativa efetiva.
export const TIPO_CHAMADA_PROVIDER_LABEL: Record<TipoChamadaProvider, string> = {
  KYC: 'KYC',
  KYB: 'KYB',
  PLD: 'PLD',
  OPEN_FINANCE: 'Open Finance',
  ASSINATURA_DIGITAL: 'Assinatura digital',
  PIX_TRANSFERENCIA: 'Transferencia Pix',
};

export const STATUS_REPROCESSO_LABEL: Record<StatusReprocesso, string> = {
  PENDENTE: 'Pendente',
  SUCESSO: 'Sucesso',
  FALHA: 'Falha',
};

// Opcoes para selects de filtro, na ordem de declaracao dos labels.
export const TIPOS_ITEM_FILA = Object.keys(TIPO_ITEM_FILA_LABEL) as TipoItemFila[];
export const PRIORIDADES_ITEM = Object.keys(PRIORIDADE_ITEM_LABEL) as PrioridadeItem[];
export const STATUS_ITENS_FILA = Object.keys(STATUS_ITEM_FILA_LABEL) as StatusItemFila[];
export const TIPOS_CHAMADA_PROVIDER = Object.keys(
  TIPO_CHAMADA_PROVIDER_LABEL,
) as TipoChamadaProvider[];

// Sufixo do UUID para identificacao curta em listas (o id completo segue no link/detalhe).
export function idCurto(id: string): string {
  return id.slice(-8);
}

// Converte uma data local (yyyy-MM-dd do input) em OffsetDateTime para o backend. O fuso
// America/Sao_Paulo e fixo em -03:00 (sem horario de verao desde 2019). "de" usa inicio do
// dia; "ate" usa fim do dia, para o intervalo cobrir o dia inteiro.
export function inicioDoDiaIso(dataLocal: string): string {
  return `${dataLocal}T00:00:00-03:00`;
}

export function fimDoDiaIso(dataLocal: string): string {
  return `${dataLocal}T23:59:59-03:00`;
}

// Extrai a mensagem amigavel do corpo de erro padronizado da API, com fallback.
// 401/403/423 sao tratados pelo errorInterceptor global; aqui cobrimos 404/409/422/5xx.
export function mensagemBackofficeErro(err: HttpErrorResponse, padrao: string): string {
  return mensagemDeErroDaApi(err, padrao);
}
