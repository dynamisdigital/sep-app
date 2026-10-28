import {
  CategoriaInvestidor,
  LancamentoEscrow,
  PerfilRiscoCredor,
  StatusAlocacao,
  StatusAporte,
  StatusCredorGestao,
  StatusSaque,
  TipoContaBancaria,
  TipoEventoCredor,
  TipoLancamentoEscrow,
} from '../../../../core/credores/credores-escrow.models';

// Apresentacao da conta escrow do credor. Valores e regras (limite, rateio, prazos) vem do backend;
// aqui so ha texto e sinal para exibicao.

export const TIPO_LANCAMENTO_LABEL: Record<TipoLancamentoEscrow, string> = {
  APORTE: 'Aporte',
  RESERVA: 'Reserva para oportunidade',
  LIBERACAO_RESERVA: 'Reserva liberada',
  DESEMBOLSO: 'Desembolso ao devedor',
  RETORNO_PRINCIPAL: 'Retorno de principal',
  RETORNO_JUROS: 'Retorno de juros',
  SAQUE: 'Saque',
  TARIFA: 'Tarifa',
};

export const STATUS_APORTE_LABEL: Record<StatusAporte, string> = {
  AGUARDANDO_PIX: 'Aguardando Pix',
  CONFIRMADO: 'Confirmado',
  EXPIRADO: 'Expirado',
};

export const STATUS_ALOCACAO_LABEL: Record<StatusAlocacao, string> = {
  RESERVADA: 'Reservada',
  EM_OPERACAO: 'Em operação',
  LIBERADA: 'Liberada',
};

export const STATUS_SAQUE_LABEL: Record<StatusSaque, string> = {
  AGUARDANDO_APROVACAO: 'Aguardando aprovação',
  EXECUTADO: 'Executado',
  REJEITADO: 'Rejeitado',
};

export const TIPO_CONTA_LABEL: Record<TipoContaBancaria, string> = {
  CORRENTE: 'Conta corrente',
  POUPANCA: 'Poupança',
  PAGAMENTO: 'Conta de pagamento',
};

export type TomSelo = 'green' | 'amber' | 'red' | 'blue';

export const TOM_APORTE: Record<StatusAporte, TomSelo> = {
  AGUARDANDO_PIX: 'amber',
  CONFIRMADO: 'green',
  EXPIRADO: 'red',
};

export const TOM_ALOCACAO: Record<StatusAlocacao, TomSelo> = {
  RESERVADA: 'amber',
  EM_OPERACAO: 'blue',
  LIBERADA: 'green',
};

export const TOM_SAQUE: Record<StatusSaque, TomSelo> = {
  AGUARDANDO_APROVACAO: 'amber',
  EXECUTADO: 'green',
  REJEITADO: 'red',
};

/**
 * Converte o texto digitado ("1.500,50", "1500.5", "300") em reais. Devolve null quando nao e um
 * valor monetario positivo com no maximo 2 casas.
 */
export function parseValorMonetario(texto: string): number | null {
  const limpo = texto.trim().replace(/\s/g, '').replace(/^R\$/i, '');
  if (!limpo) return null;
  let normalizado = limpo;
  if (limpo.includes(',')) {
    normalizado = limpo.replace(/\./g, '').replace(',', '.');
  }
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;
  const valor = Number(normalizado);
  return valor > 0 ? valor : null;
}

/** Sinal do lancamento para quem olha a conta: entrada, saida ou so movimento interno. */
export function sinalDoLancamento(lancamento: LancamentoEscrow): '+' | '−' | '' {
  if (lancamento.de === 'EXTERNO') return '+';
  if (lancamento.para === 'EXTERNO') return '−';
  return '';
}

/** Uma chave de idempotencia nova por tentativa (reaproveitada nos retries da mesma tentativa). */
export function novaChaveIdempotencia(): string {
  return globalThis.crypto.randomUUID();
}

// ---------- Gestao de credores (Backoffice) ----------

export const STATUS_CREDOR_LABEL: Record<StatusCredorGestao, string> = {
  EM_ANALISE: 'Em análise',
  ATIVO: 'Ativo',
  SUSPENSO: 'Suspenso',
  REPROVADO: 'Reprovado',
};

export const TOM_STATUS_CREDOR: Record<StatusCredorGestao, TomSelo> = {
  EM_ANALISE: 'amber',
  ATIVO: 'green',
  SUSPENSO: 'red',
  REPROVADO: 'red',
};

export const CATEGORIA_LABEL: Record<CategoriaInvestidor, string> = {
  NAO_QUALIFICADO: 'Não qualificado',
  QUALIFICADO: 'Qualificado',
};

export const PERFIL_RISCO_LABEL: Record<PerfilRiscoCredor, string> = {
  CONSERVADOR: 'Conservador',
  MODERADO: 'Moderado',
  ARROJADO: 'Arrojado',
};

export const TIPO_EVENTO_CREDOR_LABEL: Record<TipoEventoCredor, string> = {
  CADASTRO: 'Cadastro',
  APROVACAO: 'Aprovação',
  SUSPENSAO: 'Suspensão',
  REPROVACAO: 'Reprovação',
  CATEGORIA_ALTERADA: 'Categoria alterada',
  PERFIL_ALTERADO: 'Perfil alterado',
};
