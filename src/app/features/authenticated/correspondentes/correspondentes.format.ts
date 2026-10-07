import {
  AcaoAuditoria,
  EtapaFunil,
  EventoComissao,
  StatusComissao,
  StatusInteracao,
  TipoInteracao,
} from '../../../core/correspondentes/correspondentes-gestao.models';
import { gerarLinhaCsv } from '../../../core/format/csv-format';
import {
  MotivoFimVinculo,
  SituacaoOperacao,
  StatusParcela,
  StatusCadastroCorrespondente,
  StatusEnvioDocumentos,
  StatusVinculo,
} from '../../../core/correspondentes/correspondentes.models';

// Rotulos e formatos de apresentacao do modulo de Correspondentes. Nenhuma regra de negocio aqui:
// o estado ja chega decidido pelo backend e a tela so o nomeia.

export const ROTULO_CADASTRO: Record<StatusCadastroCorrespondente, string> = {
  PENDENTE: 'Pendente',
  ATIVO: 'Ativo',
  A_VENCER: 'A vencer',
  VENCIDO: 'Vencido',
  SUSPENSO: 'Suspenso',
  INATIVO: 'Inativo',
};

export const TOM_CADASTRO: Record<StatusCadastroCorrespondente, string> = {
  PENDENTE: 'amber',
  ATIVO: 'green',
  A_VENCER: 'amber',
  VENCIDO: 'red',
  SUSPENSO: 'red',
  INATIVO: 'muted',
};

export const ROTULO_VINCULO: Record<StatusVinculo, string> = {
  VIGENTE: 'Vigente',
  PERDIDO: 'Perdido',
  TRANSFERIDO: 'Transferido',
  DIRETO_SEP: 'Direto com o SEP',
};

export const TOM_VINCULO: Record<StatusVinculo, string> = {
  VIGENTE: 'green',
  PERDIDO: 'red',
  TRANSFERIDO: 'muted',
  DIRETO_SEP: 'cyan',
};

export const ROTULO_MOTIVO: Record<MotivoFimVinculo, string> = {
  CADASTRO_VENCIDO: 'Cadastro do correspondente vencido',
  PROPOSTA_SEM_CITACAO: 'Proposta assinada sem citar o correspondente',
  ELEICAO_CLIENTE: 'Cliente elegeu outro correspondente ou o SEP',
  TRANSFERENCIA_ADMIN: 'Transferido pela administração',
};

export const ROTULO_ENVIO: Record<StatusEnvioDocumentos, string> = {
  EM_VALIDACAO: 'Em validação',
  VALIDADO: 'Validado',
  DEVOLVIDO: 'Devolvido',
};

export const TOM_ENVIO: Record<StatusEnvioDocumentos, string> = {
  EM_VALIDACAO: 'amber',
  VALIDADO: 'green',
  DEVOLVIDO: 'red',
};

export function formatarData(iso: string | null): string {
  if (!iso) return '—';
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Texto curto para a situacao do prazo do cadastro. */
export function descreverPrazo(dias: number): string {
  if (dias < 0) return `vencido há ${Math.abs(dias)} dia(s)`;
  if (dias === 0) return 'vence hoje';
  return `vence em ${dias} dia(s)`;
}

export const ROTULO_OPERACAO: Record<SituacaoOperacao, string> = {
  EM_ANALISE: 'Em análise',
  EM_FORMALIZACAO: 'Em formalização',
  EM_DIA: 'Em dia',
  EM_ATRASO: 'Em atraso',
  QUITADO: 'Quitado',
  RECUSADA: 'Recusada',
};

export const TOM_OPERACAO: Record<SituacaoOperacao, string> = {
  EM_ANALISE: 'amber',
  EM_FORMALIZACAO: 'cyan',
  EM_DIA: 'green',
  EM_ATRASO: 'red',
  QUITADO: 'cyan',
  RECUSADA: 'muted',
};

export const ROTULO_PARCELA: Record<StatusParcela, string> = {
  PAGA: 'Paga',
  A_VENCER: 'A vencer',
  VENCIDA: 'Vencida',
};

export const TOM_PARCELA: Record<StatusParcela, string> = {
  PAGA: 'green',
  A_VENCER: 'cyan',
  VENCIDA: 'red',
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-10" vira "out/26". */
export function formatarMes(mes: string): string {
  const [ano, m] = mes.split('-');
  return `${MESES[Number(m) - 1]}/${ano.slice(2)}`;
}

/** Valor em reais sem centavos e com sufixo, para caber no topo de uma barra: "R$ 7,9 mil". */
export function moedaCurta(valor: number): string {
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  if (valor >= 1_000) return `R$ ${(valor / 1_000).toFixed(1).replace('.', ',')} mil`;
  return `R$ ${valor}`;
}

/** Percentual de uma razao, 0 quando nao ha base. */
export function percentual(parte: number, total: number): number {
  return total ? Math.round((parte / total) * 100) : 0;
}

// ---- Gestao comercial: funil, agenda, comissoes e auditoria ----

export const ROTULO_ETAPA: Record<EtapaFunil, string> = {
  PROSPECTADO: 'Prospectado',
  CONTATADO: 'Contatado',
  EM_NEGOCIACAO: 'Em negociação',
  DOCUMENTACAO: 'Documentação',
  ANALISE_CREDITO: 'Análise de crédito',
  APROVADO: 'Aprovado',
  CONTRATADO: 'Contratado',
  ATIVO: 'Ativo',
  PERDIDO: 'Perdido',
};

export const ROTULO_INTERACAO: Record<TipoInteracao, string> = {
  LIGACAO: 'Ligação',
  WHATSAPP: 'WhatsApp',
  VISITA: 'Visita',
  REUNIAO: 'Reunião',
  OBSERVACAO: 'Observação',
  RETORNO: 'Retorno',
  PENDENCIA_DOCUMENTAL: 'Pendência documental',
};

export const ICONE_INTERACAO: Record<TipoInteracao, string> = {
  LIGACAO: 'phone',
  WHATSAPP: 'message-square',
  VISITA: 'map-pin',
  REUNIAO: 'users',
  OBSERVACAO: 'file-text',
  RETORNO: 'rotate-ccw',
  PENDENCIA_DOCUMENTAL: 'file-up',
};

export const ROTULO_STATUS_INTERACAO: Record<StatusInteracao, string> = {
  REGISTRADA: 'Registrada',
  AGENDADA: 'Agendada',
  CONCLUIDA: 'Concluída',
  ATRASADA: 'Atrasada',
};

export const TOM_STATUS_INTERACAO: Record<StatusInteracao, string> = {
  REGISTRADA: 'muted',
  AGENDADA: 'cyan',
  CONCLUIDA: 'green',
  ATRASADA: 'red',
};

export const ROTULO_STATUS_COMISSAO: Record<StatusComissao, string> = {
  PREVISTA: 'Prevista',
  DISPONIVEL: 'Disponível',
  PAGA: 'Paga',
  ESTORNADA: 'Estornada',
};

export const TOM_STATUS_COMISSAO: Record<StatusComissao, string> = {
  PREVISTA: 'muted',
  DISPONIVEL: 'amber',
  PAGA: 'green',
  ESTORNADA: 'red',
};

export const ROTULO_EVENTO_COMISSAO: Record<EventoComissao, string> = {
  ORIGINACAO: 'Originação',
  PARCELA_RECEBIDA: 'Parcela recebida',
  ESTORNO: 'Estorno',
};

export const ROTULO_ACAO_AUDITORIA: Record<AcaoAuditoria, string> = {
  CADASTRO_RENOVADO: 'Cadastro renovado',
  VINCULO_REATRIBUIDO: 'Vínculo reatribuído',
  VINCULO_ENCERRADO: 'Vínculo encerrado',
  ENVIO_CRIADO: 'Envio criado',
  ENVIO_VALIDADO: 'Envio validado',
  ENVIO_DEVOLVIDO: 'Envio devolvido',
  REGRA_COMISSAO_ALTERADA: 'Regra de comissão alterada',
  META_ALTERADA: 'Meta alterada',
  PROSPECT_CRIADO: 'Prospect criado',
  PROSPECT_MOVIDO: 'Prospect movido',
  INTERACAO_REGISTRADA: 'Interação registrada',
};

export function formatarDataHora(iso: string): string {
  const [dia, hora] = iso.split('T');
  return `${formatarData(dia)} ${hora?.slice(0, 5) ?? ''}`.trim();
}

export function formatarPercentual(valor: number): string {
  return `${valor.toString().replace('.', ',')}%`;
}

/**
 * Baixa um relatorio em CSV. O conteudo passa pela sanitizacao contra formula injection do sistema
 * (`gerarLinhaCsv`), e o BOM faz o Excel abrir os acentos corretamente.
 */
export function baixarCsv(nome: string, cabecalho: string[], linhas: unknown[][]): void {
  const corpo = [cabecalho, ...linhas].map((l) => gerarLinhaCsv(l)).join('\r\n');
  const blob = new Blob(['\uFEFF', corpo], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}
