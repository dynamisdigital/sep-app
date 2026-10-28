// Regras puras da conta escrow do credor: livro-razao, saldo por estado, limite por devedor e rateio.
//
// Tudo aqui e funcao pura em centavos inteiros: o mock, as telas e (depois) o backend precisam chegar
// ao mesmo numero. O saldo nunca e digitado: e sempre a soma dos lancamentos.

import { centavos } from '../financeiro/calculo-financeiro';
import type {
  CategoriaInvestidor,
  LancamentoEscrow,
  LimiteDevedorResponse,
  OrigemDestino,
  SaldoEscrow,
  TipoLancamentoEscrow,
} from './credores-escrow.models';

/** Limite por credor em um mesmo devedor, na mesma SEP, para credor nao qualificado (Res. CMN 5.050, art. 24). */
export const LIMITE_POR_DEVEDOR = 15000;

/** Prazos da norma, em dias uteis (art. 21): repasse ao devedor, retorno ao credor e devolucao. */
export const PRAZO_DIAS_UTEIS = {
  REPASSE_AO_DEVEDOR: 5,
  RETORNO_AO_CREDOR: 1,
  DEVOLUCAO_AO_CREDOR: 1,
} as const;

/** De onde sai e para onde vai o valor de cada tipo de lancamento. */
export const MOVIMENTO: Record<TipoLancamentoEscrow, { de: OrigemDestino; para: OrigemDestino }> = {
  APORTE: { de: 'EXTERNO', para: 'DISPONIVEL' },
  RESERVA: { de: 'DISPONIVEL', para: 'RESERVADO' },
  LIBERACAO_RESERVA: { de: 'RESERVADO', para: 'DISPONIVEL' },
  DESEMBOLSO: { de: 'RESERVADO', para: 'EM_OPERACAO' },
  RETORNO_PRINCIPAL: { de: 'EM_OPERACAO', para: 'DISPONIVEL' },
  RETORNO_JUROS: { de: 'EXTERNO', para: 'DISPONIVEL' },
  SAQUE: { de: 'DISPONIVEL', para: 'EXTERNO' },
  TARIFA: { de: 'DISPONIVEL', para: 'EXTERNO' },
};

const ROTULO_BUCKET = {
  DISPONIVEL: 'disponível',
  RESERVADO: 'reservado',
  EM_OPERACAO: 'em operação',
} as const;

const emCentavos = (valor: number): number => Math.round((valor + Number.EPSILON) * 100);
const emReais = (cents: number): number => cents / 100;

export function saldoVazio(): SaldoEscrow {
  return { disponivel: 0, reservado: 0, emOperacao: 0, totalCustodiado: 0, patrimonio: 0 };
}

function fechar(disponivel: number, reservado: number, emOperacao: number): SaldoEscrow {
  const d = centavos(disponivel);
  const r = centavos(reservado);
  const o = centavos(emOperacao);
  return {
    disponivel: d,
    reservado: r,
    emOperacao: o,
    totalCustodiado: centavos(d + r),
    patrimonio: centavos(d + r + o),
  };
}

function campo(origem: OrigemDestino): 'disponivel' | 'reservado' | 'emOperacao' | null {
  if (origem === 'DISPONIVEL') return 'disponivel';
  if (origem === 'RESERVADO') return 'reservado';
  if (origem === 'EM_OPERACAO') return 'emOperacao';
  return null;
}

/**
 * Motivo pelo qual o lancamento nao pode ser aplicado ao saldo, ou null quando pode. Garante que o
 * valor e positivo, que o tipo respeita o movimento previsto e que nenhum estado fica negativo.
 */
export function validarLancamento(
  saldo: SaldoEscrow,
  lancamento: Pick<LancamentoEscrow, 'tipo' | 'valor' | 'de' | 'para'>,
): string | null {
  if (!Number.isFinite(lancamento.valor) || emCentavos(lancamento.valor) <= 0) {
    return 'O valor do lançamento deve ser maior que zero.';
  }
  const previsto = MOVIMENTO[lancamento.tipo];
  if (previsto.de !== lancamento.de || previsto.para !== lancamento.para) {
    return `Movimento inválido para ${lancamento.tipo}.`;
  }
  const origem = campo(lancamento.de);
  if (origem && emCentavos(saldo[origem]) < emCentavos(lancamento.valor)) {
    const bucket = lancamento.de as keyof typeof ROTULO_BUCKET;
    return `Saldo ${ROTULO_BUCKET[bucket]} insuficiente.`;
  }
  return null;
}

/** Aplica um lancamento e devolve o novo saldo. Lanca erro quando o lancamento e invalido. */
export function aplicarLancamento(
  saldo: SaldoEscrow,
  lancamento: Pick<LancamentoEscrow, 'tipo' | 'valor' | 'de' | 'para'>,
): SaldoEscrow {
  const motivo = validarLancamento(saldo, lancamento);
  if (motivo) throw new Error(motivo);
  const novo = { ...saldo };
  const origem = campo(lancamento.de);
  const destino = campo(lancamento.para);
  if (origem) novo[origem] = centavos(novo[origem] - lancamento.valor);
  if (destino) novo[destino] = centavos(novo[destino] + lancamento.valor);
  return fechar(novo.disponivel, novo.reservado, novo.emOperacao);
}

/** Saldo = soma dos lancamentos, na ordem. Nenhum estado pode ficar negativo no caminho. */
export function calcularSaldo(lancamentos: readonly LancamentoEscrow[]): SaldoEscrow {
  const ordenados = [...lancamentos].sort((a, b) =>
    a.dataLancamento.localeCompare(b.dataLancamento),
  );
  return ordenados.reduce((saldo, l) => aplicarLancamento(saldo, l), saldoVazio());
}

// ---------- Limite por devedor (art. 24) ----------

export function calcularLimiteDevedor(entrada: {
  devedorId: string;
  categoria: CategoriaInvestidor;
  alocadoAoDevedor: number;
  limite?: number;
}): LimiteDevedorResponse {
  const limite = entrada.limite ?? LIMITE_POR_DEVEDOR;
  const isento = entrada.categoria === 'QUALIFICADO';
  const alocado = centavos(entrada.alocadoAoDevedor);
  return {
    devedorId: entrada.devedorId,
    limite,
    isento,
    alocado,
    disponivel: isento ? null : Math.max(centavos(limite - alocado), 0),
  };
}

/** Motivo pelo qual a alocacao e recusada, ou null quando e aceita. */
export function validarAlocacao(entrada: {
  categoria: CategoriaInvestidor;
  alocadoAoDevedor: number;
  valor: number;
  saldoDisponivel: number;
  cienciaRisco: boolean;
  limite?: number;
}): string | null {
  if (!Number.isFinite(entrada.valor) || emCentavos(entrada.valor) <= 0) {
    return 'Informe um valor maior que zero.';
  }
  if (!entrada.cienciaRisco) {
    return 'É obrigatório declarar ciência dos riscos da operação.';
  }
  if (emCentavos(entrada.valor) > emCentavos(entrada.saldoDisponivel)) {
    return 'Saldo disponível insuficiente. Faça um aporte antes de alocar.';
  }
  if (entrada.categoria !== 'QUALIFICADO') {
    const limite = entrada.limite ?? LIMITE_POR_DEVEDOR;
    if (emCentavos(entrada.alocadoAoDevedor) + emCentavos(entrada.valor) > emCentavos(limite)) {
      return 'A alocação ultrapassa o limite por devedor para credor não qualificado.';
    }
  }
  return null;
}

// ---------- Rateio da parcela entre os credores ----------

export interface Participacao {
  credorId: string;
  valorAlocado: number;
}

export interface QuinhaoParcela {
  credorId: string;
  principal: number;
  juros: number;
  total: number;
}

/**
 * Divide um valor entre as participacoes na proporcao do que cada credor alocou. Trabalha em
 * centavos pelo metodo do maior resto, entao a soma dos quinhoes e SEMPRE igual ao valor.
 */
export function ratear(valor: number, participacoes: readonly Participacao[]): number[] {
  const total = participacoes.reduce((s, p) => s + emCentavos(p.valorAlocado), 0);
  if (participacoes.length === 0 || total <= 0) return participacoes.map(() => 0);
  const alvo = emCentavos(valor);
  const bases = participacoes.map((p) => {
    const exato = (alvo * emCentavos(p.valorAlocado)) / total;
    return { piso: Math.floor(exato), resto: exato - Math.floor(exato) };
  });
  let sobra = alvo - bases.reduce((s, b) => s + b.piso, 0);
  const ordem = bases
    .map((b, i) => ({ i, resto: b.resto }))
    .sort((a, b) => b.resto - a.resto || a.i - b.i);
  const cents = bases.map((b) => b.piso);
  for (const { i } of ordem) {
    if (sobra <= 0) break;
    cents[i] += 1;
    sobra -= 1;
  }
  return cents.map(emReais);
}

/** Rateio da parcela paga: principal e juros sao divididos separadamente, cada um fechando no centavo. */
export function ratearParcela(
  parcela: { principal: number; juros: number },
  participacoes: readonly Participacao[],
): QuinhaoParcela[] {
  const principais = ratear(parcela.principal, participacoes);
  const juros = ratear(parcela.juros, participacoes);
  return participacoes.map((p, i) => ({
    credorId: p.credorId,
    principal: principais[i],
    juros: juros[i],
    total: centavos(principais[i] + juros[i]),
  }));
}

// ---------- Prazos em dias uteis ----------

/**
 * Soma dias uteis a uma data AAAA-MM-DD, pulando sabados e domingos. Feriados nacionais nao entram:
 * o calendario oficial e do backend.
 */
export function adicionarDiasUteis(dataIso: string, dias: number): string {
  const [ano, mes, dia] = dataIso.slice(0, 10).split('-').map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  let restantes = dias;
  while (restantes > 0) {
    data.setUTCDate(data.getUTCDate() + 1);
    const diaSemana = data.getUTCDay();
    if (diaSemana !== 0 && diaSemana !== 6) restantes -= 1;
  }
  return data.toISOString().slice(0, 10);
}
